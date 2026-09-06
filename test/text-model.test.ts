import { describe, it, expect } from "vitest";
import { TextModel, type Edit } from "../src/vscode-edit.ts";

const TXT = ["@def H {","    intro","}","","@note M {","    d","}","","tail"].join("\n");

/** Line-splitter matching TextModel.rows semantics. */
function rowCount(s: string): number {
  if (s === "") return 1;
  // each "\n" adds a new row after it; count newlines + (1 if no trailing newline ended already)
  let n = 0;
  for (const ch of s) if (ch === "\n") n++;
  return s.endsWith("\n") ? n : n + 1;
}

describe("TextModel (vscode Position/Range semantics)", () => {
  it("reports exact old line span for pure in-line insertion", () => {
    const m = new TextModel(TXT);
    const e: Edit = { range: { start: { line: 1, character: 4 }, end: { line: 1, character: 4 } }, text: "x" };
    expect(m.apply(e)).toEqual({ oldFirst: 2, oldLast: 2 });
    expect(m.lineText(1)).toContain("x");
  });

  it("pasting a whole block before line 5 touches ONLY old line 5", () => {
    const m = new TextModel(TXT);
    const block = ["@tip Z", "{", "    z", "}"].join("\n") + "\n"; // own-lines above line5
    const e: Edit = { range: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } }, text: block };
    expect(m.apply(e)).toEqual({ oldFirst: 5, oldLast: 5 });
    // Original line 5 moved below the block, untouched text elsewhere.
    const beforeLines = rowCount(TXT);
    const afterRows = m.lineCount;
    expect(afterRows).toBe(beforeLines + 4); // block has 4 lines (incl the inserted trailing-empty? no)
    expect(m.lineText(4).trim()).toBe("@tip Z");
  });

  it("netLineDelta == resulting total minus original", () => {
    const block = ["@tip Z", "{", "    z", "}"].join("\n") + "\n";
    const e: Edit = { range: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } }, text: block };
    const m = new TextModel(TXT);
    const orig = m.lineCount;
    m.apply(e);
    expect(TextModel.netLineDelta(e)).toBe(m.lineCount - orig);
  });

  it("a zero-width single-line change keeps line count (net 0)", () => {
    const e: Edit = { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } }, text: "x" };
    expect(TextModel.netLineDelta(e)).toBe(0);
  });
});
