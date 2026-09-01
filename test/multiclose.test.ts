import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, blockContents } from "./helpers/webview-dom.ts";

async function renderBlocks(doc: string): Promise<string[]> {
  resetEngineState();
  const host = bootstrapWebview();
  host.window.document.body.innerHTML = await new IncrementalRenderer().fullRender(new MockEditor(doc), true);
  return blockContents(host.window);
}

/**
 * Parser fixes:
 *  1) an unnamed block whose `{` is on the next line (e.g. `@def\n{...}`) must be
 *     recognized (previously it was completely skipped → 0 blocks);
 *  2) multi-level closing: a shallower `}` (or EOF) must close all deeper blocks
 *     that are still open, so nested blocks are not swallowed as raw text.
 */
describe("parser: unnamed + next-line brace, and multi-level closing", () => {
  beforeEach(() => resetEngineState());

  it("recognizes an unnamed block with `{` on the following line", async () => {
    const doc = ["@def", "{", "    @note inner", "    {", "        body", "    }", "}"].join("\n");
    const blocks = await renderBlocks(doc);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.some((b) => b.includes("inner"))).toBe(true);
  });

  it("a shallow final `}` closes all deeper open blocks (nesting preserved)", async () => {
    const doc = [
      "@def outer {",
      "    @note A",
      "    {",
      "        one",
      "    }",
      "    @note B",
      "    {",
      "        two",
      "}",
    ].join("\n");
    const blocks = await renderBlocks(doc);
    // out{A,B} render as Definition outer ... plus its nested A and B containers
    expect(blocks).toContain("NoteAone");
    expect(blocks).toContain("NoteBtwo");
    expect(blocks.some((b) => b.startsWith("Definitionouter"))).toBe(true);
  });

  it("EOF implicitly closes a single block left open at document end", async () => {
    const doc = ["@def outer {", "    @note A", "    {", "        one"].join("\n");
    const blocks = await renderBlocks(doc);
    // A is open at EOF and must be closed (rendered) rather than dropped.
    expect(blocks.some((b) => b.includes("Aone") || b.includes("one"))).toBe(true);
    const outer = blocks.find((b) => b.startsWith("Definitionouter"));
    expect(outer).toBeDefined();
  });
});
