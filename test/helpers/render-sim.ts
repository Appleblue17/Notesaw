import type { EditorDoc, LineChange } from "../../src/incremental-renderer.ts";
import { setCounter, map, mapStartLine, mapEndLine } from "../../src/transformer.ts";
import { renderFragment } from "../../src/core.ts";

/** Resets the transformer's global bookkeeping, mirroring the extension's cleanUp(). */
export function resetEngineState() {
  setCounter(0);
  map.length = 1;
  map[0] = undefined;
  mapStartLine.length = 1;
  mapStartLine[0] = -1;
  mapEndLine.length = 1;
  mapEndLine[0] = -1;
}

/** A tiny in-memory, line-oriented editor document satisfying the EditorDoc surface. */
export class MockEditor implements EditorDoc {
  private lines: string[];

  constructor(content: string) {
    this.lines = splitLines(content);
  }

  get lineCount(): number {
    return this.lines.length;
  }

  lineText(line: number): string {
    return this.lines[line - 1] ?? "";
  }

  getTextBetweenLines(start: number, end: number): string {
    return this.lines.slice(start - 1, end).join("\n");
  }

  get text(): string {
    return this.lines.join("\n");
  }

  /** Replaces lines [startLine, endLine] with the lines of `change.text`. */
  apply(change: LineChange): void {
    const before = this.lines.slice(0, change.startLine - 1);
    const after = this.lines.slice(change.endLine);
    this.lines = before.concat(splitLines(change.text), after);
  }

  /** LineChange to insert `text` before line `atLine`. */
  insertBefore(atLine: number, text: string): LineChange {
    return { startLine: atLine, endLine: atLine - 1, text };
  }

  /** LineChange to delete lines [startLine, endLine] (inclusive). */
  delete(startLine: number, endLine: number): LineChange {
    return { startLine, endLine, text: "" };
  }

  /** LineChange to replace a single line's content in place. */
  setLine(line: number, newText: string): LineChange {
    return { startLine: line, endLine: line, text: newText };
  }
}

function splitLines(s: string): string[] {
  if (s === "") return [""];
  return s.split(/\r?\n/);
}

/**
 * Extracts the id-independent block-span fingerprint of a render snapshot.
 * Returns a sorted list of [startLine, endLine] for every real block (id > 0),
 * ignoring the globally-increasing id numbers. Two states whose fingerprint
 * matches describe the same set of block regions.
 */
export function blockFingerprint(state: {
  mapStartLine: number[];
  mapEndLine: number[];
  counter: number;
}): [number, number][] {
  const spans: [number, number][] = [];
  for (let i = 1; i <= state.counter; i++) {
    const s = state.mapStartLine[i];
    const e = state.mapEndLine[i];
    if (s === undefined || e === undefined || s <= 0 || e <= 0) continue;
    spans.push([s, e]);
  }
  return spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/**
 * Renders a document cleanly (fresh state) and returns its block fingerprint —
 * the ground truth the incremental engine should converge to.
 */
export async function groundTruthFingerprint(doc: string): Promise<[number, number][]> {
  resetEngineState();
  await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true });
  return blockFingerprint({
    mapStartLine: [...mapStartLine],
    mapEndLine: [...mapEndLine],
    counter: mapStartLine.length - 1,
  });
}

/**
 * Per-line ownership fingerprint: for each 1-based line, the ordinal (block-start
 * order) of the block that owns that line, or `null` when no block owns it.
 * Stricter than blockFingerprint because it also pins down inter-block lines.
 */
export function lineOwnFingerprint(state: {
  mapStartLine: number[];
  mapEndLine: number[];
  counter: number;
  totalLines: number;
}): (number | null)[] {
  const spans: [number, number, number][] = []; // [start, end, domId]
  for (let i = 1; i <= state.counter; i++) {
    const s = state.mapStartLine[i];
    const e = state.mapEndLine[i];
    if (s === undefined || e === undefined || s <= 0 || e <= 0) continue;
    spans.push([s, e, i]);
  }
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const ordinalOfId = new Map<number, number>();
  spans.forEach((_, idx) => ordinalOfId.set(spans[idx][2], idx));

  const out: (number | null)[] = new Array(state.totalLines + 1).fill(null);
  for (let idx = 0; idx < spans.length; idx++) {
    const [, , id] = spans[idx];
    const ord = ordinalOfId.get(id) ?? null;
    for (let ln = spans[idx][0]; ln <= spans[idx][1]; ln++) {
      if (ln >= 1 && ln <= state.totalLines) out[ln] = ord;
    }
  }
  return out.slice(1);
}

/** Clean full render of a document, returning its line-ownership fingerprint. */
export async function groundTruthLineOwnership(doc: string): Promise<(number | null)[]> {
  resetEngineState();
  await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true });
  return lineOwnFingerprint({
    mapStartLine: [...mapStartLine],
    mapEndLine: [...mapEndLine],
    counter: mapStartLine.length - 1,
    totalLines: doc.split(/\r?\n/).length,
  });
}

