import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import {
  MockEditor,
  resetEngineState,
  blockFingerprint,
  groundTruthFingerprint,
} from "./helpers/render-sim.ts";

/**
 * Repro attempts for the documented partial-rendering issues, using the
 * incremental-vs-full block-fingerprint consistency check as the oracle.
 */
describe("incremental renderer: reported issue repros", () => {
  let renderer: IncrementalRenderer;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
  });

  async function expectConverged(editor: MockEditor) {
    const truth = await groundTruthFingerprint(editor.text);
    expect(blockFingerprint(renderer.snapshot())).toEqual(truth);
  }

  it("README Issue 1: deleting inside AND outside a block in one change", async () => {
    const init = [
      "before",
      "",
      "@example goal",
      "{",
      "    alpha",
      "    beta",
      "}",
      "",
      "after",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    // One change deleting an inner line (5) and the following outer lines (6..8).
    const change = editor.delete(5, 8);
    editor.apply(change);
    const decision = await renderer.update(editor, change);

    if (decision.kind === "partial") {
      await expectConverged(editor);
    }
  });

  it("deleting a block plus its trailing blank line", async () => {
    const init = [
      "@note before",
      "{",
      "    x",
      "}",
      "",
      "@tip gone",
      "{",
      "    y",
      "}",
      "",
      "tail",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    const change = editor.delete(6, 10);
    editor.apply(change);
    const decision = await renderer.update(editor, change);

    if (decision.kind === "partial") {
      await expectConverged(editor);
    }
  });

  it("rapid single-line edits near block boundaries stay consistent", async () => {
    const init = [
      "@def A {",
      "    one",
      "}",
      "",
      "@def B {",
      "    two",
      "}",
      "@def C {",
      "    three",
      "}",
    ].join("\n");
    const editor = new MockEditor(init);
    await renderer.fullRender(editor, true);

    for (let k = 0; k < 5; k++) {
      const ins = editor.insertBefore(5, "mid *text*");
      editor.apply(ins);
      await renderer.update(editor, ins);

      const del = editor.delete(5, 5);
      editor.apply(del);
      await renderer.update(editor, del);
    }

    await expectConverged(editor);
  });

  it("oracle can detect drift (sanity: fingerprint distinguishes changed block spans)", async () => {
    const a = "@def A {\n};";
    const b = "@def A {\n    x\n}";
    const fa = await groundTruthFingerprint(a);
    const fb = await groundTruthFingerprint(b);
    // different block spans must NOT compare equal — confirms the oracle has teeth
    expect(JSON.stringify(fa)).not.toBe(JSON.stringify(fb));
  });
});
