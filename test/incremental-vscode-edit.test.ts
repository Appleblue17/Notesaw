import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor } from "./helpers/render-sim.ts";
import { bootstrapWebview, blockContents, type WebviewHost } from "./helpers/webview-dom.ts";

/**
 * VSCode-faithful incremental tests: exercise real positional edits (an edit with
 * `range.start != range.end` and/or `text` containing newlines applied at an empty
 * range) — the geometries the old whole-line mock never produced. Each step checks
 * the resulting DOM `.block-container` contents equal a clean full render of the
 * resulting text, in an isolated oracle render, then re-seeds the baseline.
 */
describe("incremental: vscode-faithful positional edits (DOM oracle)", () => {
  let renderer: IncrementalRenderer;
  let host: WebviewHost;

  beforeEach(() => {
    renderer = new IncrementalRenderer();
    host = bootstrapWebview();
  });

  function blockContentsOf(w: WebviewHost["window"]): string[] {
    const mb = w.document.querySelector(".markdown-body");
    if (!mb) return [];
    return Array.from(mb.querySelectorAll(".block-container")).map((el: any) =>
      el.textContent.replace(/\s+/g, " ").trim(),
    );
  }

  /** Applies ONE vscode edit, updates the DOM, and asserts equality with a clean full render. */
  async function expectPositional(
    editor: MockEditor,
    edit: Parameters<MockEditor["apply"]>[0],
    label: string,
  ) {
    editor.apply(edit);
    const decision = await renderer.update(editor, edit);
    if (decision.kind === "partial" && decision.raw !== undefined) {
      host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
    } else if (decision.kind === "full") {
      host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    }
    const inc = blockContentsOf(host.window);

    // isolated clean full render of the resulting text
    const fresh = new IncrementalRenderer();
    const tmp = new MockEditor(editor.text);
    const th = bootstrapWebview();
    th.window.document.body.innerHTML = await fresh.fullRender(tmp, true);
    const truth = blockContentsOf(th.window);

    expect(inc, label).toEqual(truth);

    // re-seed baseline from the resulting document for the next step
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
  }

  const DOC = [
    "@def A {",
    "    one",
    "    two",
    "}",
    "",
    "middle paragraph text",
    "",
    "@note B {",
    "    body",
    "}",
  ].join("\n");

  it("typing a char mid-line into a plain paragraph (empty-range insert)", async () => {
    const e = new MockEditor(DOC);
    host.window.document.body.innerHTML = await renderer.fullRender(e, true);
    // append '!' at line 6 (0-based 5), after "paragraph" word
    const edit = e.rawEdit({ line: 5, character: 8 }, { line: 5, character: 8 }, "XYZ");
    await expectPositional(e, edit, "mid-line insert in paragraph");
  });

  it("overwrite a 3-char span mid-paragraph (range.end > range.start, single line)", async () => {
    const e = new MockEditor(DOC);
    host.window.document.body.innerHTML = await renderer.fullRender(e, true);
    const edit = e.rawEdit({ line: 5, character: 0 }, { line: 5, character: 6 }, "CHANGED");
    await expectPositional(e, edit, "single-line range replace");
  });

  it("paste a two-line fresh content block on a boundary line before a block", async () => {
    const e = new MockEditor(DOC);
    host.window.document.body.innerHTML = await renderer.fullRender(e, true);
    // blank line at 1-based 7 (0-based index 6) sits between the paragraph and @note.
    // Inserting two plain lines at its start must stay in sync with a full render.
    const edit = e.rawEdit(
      { line: 6, character: 0 },
      { line: 6, character: 0 },
      "before paragraph\n# Heading insert",
    );
    await expectPositional(e, edit, "multi-line insert at line start");
  });

  it("keeps a plain empty-range insert of a whole block at a line boundary in sync", async () => {
    const e = new MockEditor(DOC);
    host.window.document.body.innerHTML = await renderer.fullRender(e, true);
    const edit = e.rawEdit(
      { line: 0, character: 0 },
      { line: 0, character: 0 },
      "@tip Z {\n    val\n}\n\n",
    );
    await expectPositional(e, edit, "whole block pasted at top (empty range, multiline text)");
  });
});
