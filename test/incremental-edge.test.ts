import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import {
  MockEditor,
  resetEngineState,
  lineOwnFingerprint,
  groundTruthLineOwnership,
} from "./helpers/render-sim.ts";

/**
 * Edge-case oracle tests: nested blocks, large multi-line deletions, and
 * shrinking the document toward empty must all stay consistent with a clean
 * full render.
 */
describe("incremental renderer: edge cases", () => {
  let renderer: IncrementalRenderer;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
  });

  async function expectConverged(editor: MockEditor) {
    const truth = await groundTruthLineOwnership(editor.text);
    expect(lineOwnFingerprint(renderer.snapshot())).toEqual(truth);
    expect(editor.lineCount).toBe(truth.length);
  }

  it("handles nested blocks inside a block", async () => {
    const init = [
      "@example outer",
      "{",
      "    @note inner one",
      "    {",
      "        inner body",
      "    }",
      "    trailing",
      "}",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    const change = editor.delete(5, 5); // remove one line of the nested body
    editor.apply(change);
    await renderer.update(editor, change);
    await expectConverged(editor);

    const change2 = editor.insertBefore(3, "    @tip leaf\n    {\n        extra\n    }");
    editor.apply(change2);
    await renderer.update(editor, change2);
    await expectConverged(editor);
  });

  it("survives a large multi-block deletion (negative delta)", async () => {
    const init = Array.from({ length: 8 }, (_, i) => [
      `@def Block${i} {`,
      "    content",
      "}",
      "",
    ]).flat().join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    // Delete a large swath covering ~3 full blocks
    const change = editor.delete(5, 16);
    editor.apply(change);
    const decision = await renderer.update(editor, change);
    if (decision.kind === "partial") await expectConverged(editor);
  });

  it("shrinks toward an empty/short document", async () => {
    const init = [
      "@def A {",
      "    one",
      "}",
      "@def B {",
      "    two",
      "}",
      "@def C {",
      "    three",
      "}",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    // delete 8 lines -> leaves 1 line
    const change = editor.delete(2, 9);
    editor.apply(change);
    const decision = await renderer.update(editor, change);
    if (decision.kind === "partial") await expectConverged(editor);
  });

  it("handles editing right around a block's opening brace line", async () => {
    const init = [
      "@example hello",
      "{",
      "    body",
      "}",
      "# heading",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    // insert a paragraph between the block and heading
    const ins = editor.insertBefore(5, "between text");
    editor.apply(ins);
    await renderer.update(editor, ins);
    await expectConverged(editor);

    // replace the block's first content line
    const rep = editor.setLine(3, "    changed body");
    editor.apply(rep);
    await renderer.update(editor, rep);
    await expectConverged(editor);
  });
});
