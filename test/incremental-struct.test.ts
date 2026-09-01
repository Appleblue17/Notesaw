import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, type WebviewHost } from "./helpers/webview-dom.ts";

function blockContents(window: WebviewHost["window"]): string[] {
  const mb = window.document.querySelector(".markdown-body");
  if (!mb) return [];
  return Array.from(mb.querySelectorAll(".block-container")).map((el: any) =>
    el.textContent.replace(/\s+/g, " ").trim(),
  );
}

/**
 * Single-step oracle: for each predefined structural edit, apply ONE incremental
 * change to the DOM, then assert the resulting DOM block contents equal a clean
 * full render of the resulting document. By re-seeding from the clean render tree
 * each step, this isolates the FIRST operation whose incremental handling drifts
 * — a minimal repro of a partial-render bug, without random-sequence noise.
 */
describe("incremental: single-step DOM oracle", () => {
  let renderer: IncrementalRenderer;
  let host: WebviewHost;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
    host = bootstrapWebview();
  });

  const DOC = [
    "@def A {",
    "    one",
    "    two",
    "}",
    "",
    "@note B {",
    "    body",
    "}",
    "",
    "tail paragraph",
  ].join("\n");

  async function freshWithDoc(text: string) {
    const e = new MockEditor(text);
    host.window.document.body.innerHTML = await renderer.fullRender(e, true);
    return e;
  }

  async function expectSingleStep(editor: MockEditor, change: Parameters<MockEditor["apply"]>[0], label: string) {
    editor.apply(change);
    const decision = await renderer.update(editor, change);
    if (decision.kind === "partial" && decision.raw !== undefined) {
      host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
    } else if (decision.kind === "full") {
      host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    }
    const inc = blockContents(host.window);
    // clean full render of resulting doc (isolated state)
    resetEngineState();
    const fresh = new IncrementalRenderer();
    const tmp = new MockEditor(editor.text);
    const th = bootstrapWebview();
    th.window.document.body.innerHTML = await fresh.fullRender(tmp, true);
    const truth = blockContents(th.window);
    expect(inc, label).toEqual(truth);
    // re-seed main baseline from the resulting doc for the next step
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
  }

  it("delete a block's first content line", async () => {
    const e = await freshWithDoc(DOC);
    await expectSingleStep(e, e.delete(3, 3), "delete first content line of @def A");
  });

  it("delete a block's opening brace line ({) breaks structure", async () => {
    const e = await freshWithDoc(DOC);
    await expectSingleStep(e, e.delete(2, 2), "delete '{' line");
  });

  // Right-edge extension handles a deleted closing brace by widening the interval
  // to the next sibling, so the DOM stays consistent with a full render.
  it("delete a block's closing brace line (})", async () => {
    const e = await freshWithDoc(DOC);
    await expectSingleStep(e, e.delete(4, 4), "delete '}' line");
  });

  it("insert an unindented line inside a block body", async () => {
    const e = await freshWithDoc(DOC);
    await expectSingleStep(e, e.insertBefore(4, "not indented text"), "insert unindented line in block");
  });

  it("replace a block body line with a quote", async () => {
    const e = await freshWithDoc(DOC);
    await expectSingleStep(e, e.setLine(3, "> quote"), "set line 3 to quote");
  });

  it("move a block: delete it then reinsert elsewhere", async () => {
    const e = await freshWithDoc(DOC);
    // delete the @note B block (lines 6-8) and reinsert after tail
    await expectSingleStep(e, e.delete(6, 8), "move: delete @note B");
    await expectSingleStep(e, e.insertBefore(editorLineCount(e), "@note B { body-moved }"), "move: reinsert");
  });

  function editorLineCount(e: MockEditor) {
    return e.lineCount;
  }
});
