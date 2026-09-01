/**
 * @file Incremental render decision engine.
 *
 * Extracted from `src/extension.ts` so the partial-rendering logic can be unit
 * tested and hardened in isolation, without a running VS Code host. It decides
 * WHICH range of the editor must be re-rendered for a given text change and how
 * the line→block maps shift, then delegates fragment rendering to the shared core.
 *
 * This is the SINGLE source of truth for incremental-update decisions: the VS Code
 * extension calls this engine; tests drive the same engine. It owns a private
 * `SpanState` so its positional bookkeeping is isolated from any parallel render
 * (a test-oracle full render no longer overwrites the engine's maps).
 */

import { renderFragment } from "./core.ts";
import { SpanState } from "./transformer.ts";

/** Minimal editor document surface the render engine needs (no vscode types). */
export interface EditorDoc {
  lineCount: number;
  /** 1-based line text of the FULL current document. */
  lineText(line: number): string;
  /** 1-based; doc.lineText for the given lines. */
  getTextBetweenLines(start: number, end: number): string;
}

/** A text change in 1-based line coordinates, mirroring extension.ts semantics. */
export interface LineChange {
  /** 1-based first affected line. */
  startLine: number;
  /** 1-based last affected line before the change. */
  endLine: number;
  /** Full replacement text (may span multiple lines). */
  text: string;
}

export interface PartialDecision {
  kind: "full" | "partial";
  /** fragment text to render */
  raw?: string;
  /** decision parameters forwarded to noteProcess/renderFragment */
  baseLine?: number;
  fatherId?: number;
  labelRoot?: boolean;
  /** partial DOM targets (ids to locate in the current DOM) */
  x?: number;
  y?: number;
  fat?: number;
}

export interface Snapshot extends ReturnType<SpanState["snapshot"]> {
  totalLines: number;
}

/**
 * Stateful incremental-rendering engine. Mirrors the extension's `handleDocChange`
 * / `handleTextChange` logic including its independent `totalLines` bookkeeping.
 */
export class IncrementalRenderer {
  /** Total lines of the last rendering (edit-before line count). Mirrors extension.ts `totalLines`. */
  private totalLines = 0;
  /** Isolated positional bookkeeping for this engine. */
  private state = new SpanState();

  /** Returns the engine's underlying span state (for injecting into renders). */
  get spanState(): SpanState {
    return this.state;
  }

  /** Resets the engine's own bookkeeping (extension `cleanUp`). */
  reset(): void {
    this.totalLines = 0;
    this.state.reset();
  }

  /**
   * Renders a full document (extension `handleDocChange`).
   * Returns the full-content HTML fragment.
   */
  async fullRender(doc: EditorDoc, labelRoot: boolean): Promise<string> {
    this.totalLines = doc.lineCount;
    this.state.extendMapArray(this.totalLines);
    const html = await renderFragment(this.fullText(doc), {
      baseLine: 0,
      fatherId: 0,
      labelRoot,
      spanState: this.state,
    });
    return html;
  }

  /**
   * Renders an incremental update for one text change (extension `handleTextChange`).
   * Mutates the engine's span state and returns the decision the extension should
   * forward to the webview (or `kind: "full"` to force a full re-render).
   */
  async update(doc: EditorDoc, change: LineChange): Promise<PartialDecision> {
    const startLine = change.startLine;
    const endLine = change.endLine;
    const textLines = change.text.split(/\r?\n/).length;
    const newEndLine = startLine + textLines - 1;
    const deltaLength = newEndLine - endLine;

    const st = this.state;
    const { map, mapFather, mapDepth, mapStartLine, mapEndLine, counter } = st;

    const buildBoundaries = () => {
      const last: (number | undefined)[] = [...map];
      const next: (number | undefined)[] = [...map];
      for (let i = 1; i < last.length; i++) {
        if (last[i] === undefined) last[i] = last[i - 1];
      }
      for (let i = next.length - 2; i >= 0; i--) {
        if (next[i] === undefined) next[i] = next[i + 1];
      }
      return { last, next };
    };

    const { last, next } = buildBoundaries();

    const lastId = last[startLine] !== undefined ? last[startLine] : next[startLine];
    const nextId = next[endLine] !== undefined ? next[endLine] : last[endLine];

    // Defensive: a boundary may resolve to an id whose span was invalidated (a ghost)
    // while the line map still referenced it. Such an id is not a real block, so its
    // span cannot anchor a partial update — degrade to a full re-render rather than
    // emit an invalid (e.g. negative-line) fragment.
    const spanValid = (id: number): boolean =>
      id !== undefined && mapStartLine[id] !== undefined && mapStartLine[id] > 0 && mapEndLine[id] !== undefined && mapEndLine[id] > 0;

    if (lastId === undefined || nextId === undefined || !spanValid(lastId) || !spanValid(nextId)) {
      // Cannot determine affected blocks safely: fall back to a full re-render.
      return { kind: "full" };
    }

    const findLCA = (x: number, y: number): [number, number, number] => {
      while (mapDepth[x] > mapDepth[y]) x = mapFather[x];
      while (mapDepth[y] > mapDepth[x]) y = mapFather[y];
      if (x === y) return [x, x, mapFather[x]];
      while (mapFather[x] !== mapFather[y]) {
        x = mapFather[x];
        y = mapFather[y];
      }
      return [x, y, mapFather[x]];
    };

    const [x0, y0, fat0] = findLCA(lastId as number, nextId as number);

    // The LCA may climb through a ghost (invalidated) id on its father chain, so
    // the chosen x/y can still be a phantom whose span was cleared. If so we cannot
    // anchor a partial update reliably — degrade to a full re-render.
    if (!spanValid(x0) || !spanValid(y0)) {
      return { kind: "full" };
    }

    let x = x0;
    let y = y0;
    const fat = fat0;

    // Finds the sibling of `id` (same father) whose span starts right after `id`'s
    // start. Used to widen the incremental range across a structural re-parse.
    const findNextSibling = (id: number): number | undefined => {
      const father = mapFather[id];
      const aroundStart = mapStartLine[id];
      let best: { id: number; start: number } | undefined;
      for (let i = 1; i <= counter; i++) {
        if (i === id) continue;
        if (mapFather[i] !== father) continue;
        const s = mapStartLine[i];
        if (s === undefined || s <= 0) continue;
        if (s > aroundStart && (!best || s < best.start)) best = { id: i, start: s };
      }
      return best?.id;
    };

    // Right-edge extension: if the edit range reaches y's closing line, y may have
    // swallowed its next sibling (that sibling's `}` acts as y's new closer, or the
    // block boundary moved). Re-render through that sibling so the parser sees it.
    if (endLine >= mapEndLine[y]) {
      y = findNextSibling(y) ?? y;
    }

    const xLine = Math.min(mapStartLine[x], startLine);
    const yLine = Math.max(mapEndLine[y], endLine);
    const newYLine = yLine + deltaLength;
    const editorTotalLines = doc.lineCount;

    const updateMapLines = (line: number, start: number, end: number) => {
      while (line !== undefined) {
        let flag = false;
        if (start < mapStartLine[line]) {
          mapStartLine[line] = start;
          flag = true;
        }
        if (end > mapEndLine[line]) {
          mapEndLine[line] = end;
          flag = true;
        }
        if (!flag) break;
        line = mapFather[line];
        start = Math.min(start, mapStartLine[line]);
        end = Math.max(end, mapEndLine[line]);
      }
    };

    // Shift start/end lines of existing blocks.
    for (let i = 1; i <= counter; i++) {
      if (mapEndLine[i] >= xLine) mapEndLine[i] += deltaLength;
      if (mapStartLine[i] > yLine) mapStartLine[i] += deltaLength;
    }

    st.extendMapArray(editorTotalLines);
    if (deltaLength > 0) {
      for (let i = this.totalLines; i > yLine; i--) map[i + deltaLength] = map[i];
    } else {
      for (let i = yLine + 1; i <= this.totalLines; i++) map[i + deltaLength] = map[i];
    }
    for (let i = xLine; i <= newYLine; i++) map[i] = undefined;
    st.shrinkMapArray(editorTotalLines);

    const raw = doc.getTextBetweenLines(xLine, newYLine);
    const html = await renderFragment(raw, {
      baseLine: xLine - 1,
      fatherId: fat,
      labelRoot: false,
      spanState: this.state,
    });

    // Clean up ghost ids: a re-render replaces the affected sub-tree with freshly
    // allocated ids, but the spans of the OLD ids it displaced stay in the span
    // arrays and, because the line-shift loop (above) also moves them, they end up
    // overlapping live blocks. An id that no line in `map` references is no longer
    // part of the current structure, so invalidate it.
    const live = new Set<number>();
    for (const v of map) {
      if (v !== undefined && v > 0) live.add(v);
    }
    for (let i = 1; i <= counter; i++) {
      if (mapStartLine[i] > 0 && !live.has(i)) {
        mapStartLine[i] = -1;
        mapEndLine[i] = -1;
      }
    }

    for (let i = 1; i <= counter; i++) {
      updateMapLines(mapFather[i], mapStartLine[i], mapEndLine[i]);
    }

    this.totalLines = editorTotalLines;

    return { kind: "partial", raw: html, baseLine: xLine - 1, fatherId: fat, labelRoot: false, x, y, fat };
  }

  /** Returns the full text of the document adapter. */
  private fullText(doc: EditorDoc): string {
    const parts: string[] = [];
    for (let i = 1; i <= doc.lineCount; i++) parts.push(doc.lineText(i));
    return parts.join("\n");
  }

  snapshot(): Snapshot {
    return {
      ...this.state.snapshot(),
      totalLines: this.totalLines,
    };
  }
}
