import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import {
  MockEditor,
  resetEngineState,
  blockFingerprint,
  groundTruthFingerprint,
} from "./helpers/render-sim.ts";

/**
 * Incremental-vs-full consistency: after a sequence of edits, the incremental
 * engine's block fingerprint must equal the clean full render of the final text.
 */
describe("incremental renderer: consistency with full render", () => {
  let renderer: IncrementalRenderer;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
  });

  async function expectConverged(editor: MockEditor) {
    const truth = await groundTruthFingerprint(editor.text);
    expect(blockFingerprint(renderer.snapshot())).toEqual(truth);
  }

  it("converges after deleting content inside a block", async () => {
    const init = [
      "intro",
      "",
      "@example hello",
      "{",
      "    line one",
      "    line two",
      "}",
      "",
      "trailer",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    const change = editor.delete(5, 5);
    editor.apply(change);
    await renderer.update(editor, change);

    await expectConverged(editor);
  });

  it("converges after inserting a new block between two existing ones", async () => {
    const init = [
      "@example one",
      "{",
      "    body",
      "}",
      "",
      "@note two",
      "{",
      "    body",
      "}",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    const change = editor.insertBefore(6, "@tip mid\n{\n    inserted\n}");
    editor.apply(change);
    await renderer.update(editor, change);

    await expectConverged(editor);
  });

  it("converges after deleting an entire block", async () => {
    const init = [
      "@example one",
      "{",
      "    body",
      "}",
      "",
      "@note two",
      "{",
      "    body",
      "}",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    const change = editor.delete(6, 9);
    editor.apply(change);
    await renderer.update(editor, change);

    await expectConverged(editor);
  });

  it("converges after a multi-step insert and delete sequence", async () => {
    const init = ["@def A {", "    one", "}", "", "@def B {", "    two", "}"].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    const ins1 = editor.insertBefore(4, "some *text*");
    editor.apply(ins1);
    await renderer.update(editor, ins1);

    const del = editor.delete(4, 4);
    editor.apply(del);
    await renderer.update(editor, del);

    const ins2 = editor.insertBefore(1, "@note header\n{\n    lead\n}");
    editor.apply(ins2);
    await renderer.update(editor, ins2);

    await expectConverged(editor);
  });
});
