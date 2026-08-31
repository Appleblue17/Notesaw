/**
 * @file Incremental render decision engine.
 *
 * Extracted from `src/extension.ts` so the partial-rendering logic can be unit
 * tested and hardened in isolation, without a running VS Code host. It decides
 * WHICH range of the editor must be re-rendered for a given text change and how
 * the line→block maps shift, then delegates fragment rendering to the shared core.
 *
 * This is the SINGLE source of truth for incremental-update decisions: the VS Code
 * extension calls this engine; tests drive the same engine. It is intentionally
 * coupled to the global bookkeeping arrays in `src/transformer.ts` (and their
 * side effects during rendering) so it behaves exactly like the extension, so a
 * bug found by tests is the same bug the extension would hit.
 */

import { renderFragment } from "./core.ts";
import {
  counter,
  map,
  mapFather,
  mapDepth,
  mapStartLine,
  mapEndLine,
  extendMapArray,
  shrinkMapArray,
} from "./transformer.ts";

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

export interface Snapshot {
  counter: number;
  map: (number | undefined)[];
  mapFather: number[];
  mapDepth: number[];
  mapStartLine: number[];
  mapEndLine: number[];
  totalLines: number;
}

/**
 * Stateful incremental-rendering engine. Mirrors the extension's `handleDocChange`
 * / `handleTextChange` logic including its independent `totalLines` bookkeeping.
 */
export class IncrementalRenderer {
  /** Total lines of the last rendering (edit-before line count). Mirrors extension.ts `totalLines`. */
  private totalLines = 0;

  /** Resets the engine's own bookkeeping (extension `cleanUp`). */
  reset(): void {
    this.totalLines = 0;
  }

  /**
   * Renders a full document (extension `handleDocChange`).
   * Returns the full-content HTML fragment.
   */
  async fullRender(doc: EditorDoc, labelRoot: boolean): Promise<string> {
    this.totalLines = doc.lineCount;
    extendMapArray(this.totalLines);
    const html = await renderFragment(this.fullText(doc), {
      baseLine: 0,
      fatherId: 0,
      labelRoot,
    });
    return html;
  }

  /**
   * Renders an incremental update for one text change (extension `handleTextChange`).
   * Mutates the transformer map state and returns the decision the extension
   * should forward to the webview (or `kind: "full"` to force a full re-render).
   */
  async update(doc: EditorDoc, change: LineChange): Promise<PartialDecision> {
    const startLine = change.startLine;
    const endLine = change.endLine;
    const textLines = change.text.split(/\r?\n/).length;
    const newEndLine = startLine + textLines - 1;
    const deltaLength = newEndLine - endLine;

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
      // Cannot determine affected blocks: fall back to a full re-render.
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

    const [x, y, fat] = findLCA(lastId as number, nextId as number);

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

    extendMapArray(editorTotalLines);
    if (deltaLength > 0) {
      for (let i = this.totalLines; i > yLine; i--) map[i + deltaLength] = map[i];
    } else {
      for (let i = yLine + 1; i <= this.totalLines; i++) map[i + deltaLength] = map[i];
    }
    for (let i = xLine; i <= newYLine; i++) map[i] = undefined;
    shrinkMapArray(editorTotalLines);

    const raw = doc.getTextBetweenLines(xLine, newYLine);
    const html = await renderFragment(raw, {
      baseLine: xLine - 1,
      fatherId: fat,
      labelRoot: false,
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
      counter,
      map: [...map],
      mapFather: [...mapFather],
      mapDepth: [...mapDepth],
      mapStartLine: [...mapStartLine],
      mapEndLine: [...mapEndLine],
      totalLines: this.totalLines,
    };
  }
}
