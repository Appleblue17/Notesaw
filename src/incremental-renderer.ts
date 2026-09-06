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
import type { Edit } from "./vscode-edit.ts";

/** Minimal editor document surface the render engine needs (no vscode types). */
export interface EditorDoc {
  lineCount: number;
  /** 1-based line text of the FULL current document. */
  lineText(line: number): string;
  /** 1-based; doc.lineText for the given lines. */
  getTextBetweenLines(start: number, end: number): string;
}

/**
 * A text change, expressed with exact VSCode geometry: an `Edit` (`range`+`text`)
 * over 0-based `{line,character}` positions where a pure insertion has
 * `range.start == range.end`. This is the single geometry both the engine and the
 * editor mock (and the real extension bridge) agree on — the engine no longer
 * guesses whole-line spans.
 */
export type TextChange = Edit;

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

  /**
   * Diagnostic counters for full-render fallbacks.
   *
   * Because degrading to a `kind:"full"` decision is a sign the incremental
   * machinery could not (or would not) compute a valid partial, every occurrence is
   * recorded so tests can *observe* full fallbacks instead of silently swallowing
   * them. These are observational only — they never change a decision.
   */
  private fullCount = 0;
  private fullReasons: string[] = [];

  /** Number of times `update()` returned a proactive `kind:"full"` decision. */
  get fullFallbackCount(): number {
    return this.fullCount;
  }

  /** Ordered list of reasons for each proactive full fallback ("" when none). */
  get fullFallbackReasons(): readonly string[] {
    return this.fullReasons;
  }

  /** Returns the engine's underlying span state (for injecting into renders). */
  get spanState(): SpanState {
    return this.state;
  }

  /** Resets the engine's own bookkeeping plus the diagnostic full counters. */
  reset(): void {
    this.totalLines = 0;
    this.state.reset();
    this.fullCount = 0;
    this.fullReasons = [];
  }

  /** Records a proactive full fallback and returns the `{kind:"full"}` decision. */
  private full(reason: string): { kind: "full" } {
    this.fullCount++;
    this.fullReasons.push(reason);
    return { kind: "full" };
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
   * `doc` must already reflect the post-edit document (VS Code mutates the document
   * before the change fires; the mock helpers apply the edit first). The net line
   * delta is read authoritatively from `doc.lineCount` vs the engine's last-known
   * total — no whole-line guessing — and the affected OLD boundary lines come from
   * the edit's true `range`.
   */
  async update(doc: EditorDoc, change: TextChange): Promise<PartialDecision> {
    // 0-based range over the OLD coordinates the edit was issued against.
    const rlo = change.range.start.line;
    const rhi = change.range.end.line;
    const startLine = Math.min(rlo, rhi) + 1; // 1-based inclusive old first affected line
    const endLine = Math.max(rlo, rhi) + 1; // 1-based inclusive old last affected line

    // Authoritative net delta: doc already reflects the post-edit text.
    const editorTotalLines = doc.lineCount;
    const deltaLength = editorTotalLines - this.totalLines;

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

    if (lastId === undefined || nextId === undefined) {
      // No block owned the edit boundaries; cannot anchor a partial.
      return this.full(`boundary empty (lastId=${lastId} nextId=${nextId})`);
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

    let x = x0;
    let y = y0;
    const fat = fat0;

    // Finds the sibling of `id` (same father) that comes right AFTER `id` — i.e.
    // whose span begins after `id`'s span ENDS. Stale shadow ids from earlier
    // re-renders may still share the father and START after `id` but OVERLAP its
    // span (e.g. an old duplicate of the same region); those are not real siblings
    // and must not widen the range onto a phantom block.
    const findNextSibling = (id: number): number | undefined => {
      const father = mapFather[id];
      const afterEnd = mapEndLine[id];
      let best: { id: number; start: number } | undefined;
      // Only a block still referenced by `map` is a real, current sibling. Stale
      // ids from earlier re-renders linger in the span arrays (with no map row) and
      // would otherwise be offered as phantom next siblings.
      const mapped = new Set<number>();
      for (const v of map) if (v !== undefined && v > 0) mapped.add(v);
      for (let i = 1; i <= counter; i++) {
        if (!mapped.has(i)) continue;
        if (i === id) continue;
        if (mapFather[i] !== father) continue;
        const s = mapStartLine[i];
        if (s === undefined || s <= 0) continue;
        if (s > afterEnd && (!best || s < best.start)) best = { id: i, start: s };
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
