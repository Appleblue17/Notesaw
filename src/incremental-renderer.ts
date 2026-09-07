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

    // Bottom of the re-render window in old coordinates, then new. The window is
    // [xLine..newYLine]; everything between is cleared and rebuilt from a fresh
    // fragment render, so the parser re-owns those rows from the post-edit text.
    const xLine = Math.min(mapStartLine[x], startLine);
    let yLine = Math.max(mapEndLine[y], endLine); // old-coord bottom pivot
    let newYLine = yLine + deltaLength; // new-coord bottom

    // Right edge by source text (no block kinds, no sibling-id scans). If this edit
    // reached / removed the closer of the far container `x` itself, `x` is left open
    // right after our window and the parser will swallow subsequent rows until a `}`
    // at the same indentation column. We walk those rows; if the swallow passes our
    // window bottom we widen it to the re-closing `}` (or to EOF when none). The
    // fragment is re-parsed from scratch, so widening only adds rows that re-fold
    // into `x`; untouched blocks land at/after the returned re-close.
    let widened = false;
    if (endLine >= mapEndLine[y]) {
      const fatLimit = mapEndLine[fat] + deltaLength;
      if (newYLine < fatLimit) {
        const openerCol = this.openerColumn(doc, mapStartLine[x] ?? 1);

        newYLine++;
        widened = true;

        while (newYLine < fatLimit) {
          // Try to widen the window to the next `}` that closes the container opened at `openerCol`.
          const line = doc.lineText(newYLine);
          const col = this.openerColumn(doc, newYLine);
          if (col === openerCol && line.trimStart()[0] === "}") {
            break;
          }
          newYLine++;
        }
      }
    }
    const updateMapLines = (id: number, start: number, end: number) => {
      while (id !== undefined) {
        let flag = false;
        if (start < mapStartLine[id]) {
          mapStartLine[id] = start;
          flag = true;
        }
        if (end > mapEndLine[id]) {
          mapEndLine[id] = end;
          flag = true;
        }
        if (!flag) break;
        id = mapFather[id];
        start = Math.min(start, mapStartLine[id]);
        end = Math.max(end, mapEndLine[id]);
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

    // Re-anchor `y` to the current sibling (a direct child of `fat`) that contains
    // the bottom row, so the DOM splice trims through the widened fold. Operate on
    // the map AFTER the row shift (new coords) but BEFORE clearing.
    if (widened && map.length > newYLine) {
      const owner = map[newYLine] as number | undefined;
      if (owner !== undefined && owner > 0) {
        let anc = owner;
        while (anc && mapFather[anc] !== fat) anc = mapFather[anc];
        if (mapFather[anc] === fat) {
          y = anc;
          newYLine = mapEndLine[y]; // Must extend the window to the new bottom of the re-anchored block.
        } else return this.full(`Failed to re-anchor y: owner=${owner} fat=${fat}`);
      } else return this.full(`Failed to re-anchor y: owner=${owner} fat=${fat}`);
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

    return {
      kind: "partial",
      raw: html,
      baseLine: xLine - 1,
      fatherId: fat,
      labelRoot: false,
      x,
      y,
      fat,
    };
  }

  /**
   * 1-based column of the first non-space char of a row (0 if blank). Notesaw opens
   * a block at some column and closes it with a `}` on the SAME column.
   */
  private openerColumn(doc: EditorDoc, row: number): number {
    if (row <= 0 || row > doc.lineCount) return 0;
    // Count the leading spaces/tabs of the line, then add 1 for 1-based column.
    // One tab = 4 spaces (the parser's tab width). This is the same logic as `src/core.ts` `noteProcess()`.
    const line = doc.lineText(row);
    let total = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === " ") total++;
      else if (ch === "\t") total += 4;
      else break;
    }
    return total + 1;
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
