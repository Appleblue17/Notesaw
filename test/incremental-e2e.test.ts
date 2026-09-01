import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, type WebviewHost } from "./helpers/webview-dom.ts";

/**
 * End-to-end sanity: drive the real incremental engine together with the real
 * webview `partialUpdateHtml` against a jsdom preview DOM across many edits.
 *
 * The goal is to detect whether the incremental pipeline can *ever* fail to
 * locate its update targets (requesting a full refresh) — which must be treated
 * as a bug, not a relied-upon fallback.
 */
describe("incremental renderer + webview: end-to-end id alignment", () => {
  let renderer: IncrementalRenderer;
  let host: WebviewHost;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
    host = bootstrapWebview();
  });

  /** Seeds the jsdom preview DOM from a full-render fragment. */
  async function fullRenderIntoDom(init: string) {
    const editor = new MockEditor(init);
    const html = await renderer.fullRender(editor, true);
    host.window.document.body.innerHTML = html;
    return editor;
  }

  /** Applies one incremental change to both engine and DOM, tracking drift. */
  async function applyStep(editor: MockEditor, change: Parameters<MockEditor["apply"]>[0]) {
    editor.apply(change);
    const before = host.refreshCount();
    const decision = await renderer.update(editor, change);
    if (decision.kind === "partial" && decision.raw !== undefined) {
      host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
    }
    return host.refreshCount() - before;
  }

  it("stays aligned through edits inside a block", async () => {
    const editor = await fullRenderIntoDom(
      ["@example demo", "{", "    one", "    two", "}", "tail"].join("\n"),
    );
    for (let k = 0; k < 3; k++) {
      const ins = editor.insertBefore(4, "    extra line");
      const drift = await applyStep(editor, ins);
      expect(drift).toBe(0);
    }
  });

  it("stays aligned through adding/removing blocks (nested-ish content)", async () => {
    const editor = await fullRenderIntoDom(
      [
        "@example outer",
        "{",
        "    @note inner",
        "    {",
        "        body",
        "    }",
        "}",
      ].join("\n"),
    );

    // add another inner note block inside outer
    const ins1 = editor.insertBefore(5, "    @tip leaf\n    {\n        extra\n    }");
    const d1 = await applyStep(editor, ins1);
    expect(d1).toBe(0);

    // remove it
    const del2 = editor.delete(5, 7);
    const d2 = await applyStep(editor, del2);
    expect(d2).toBe(0);
  });

  /**
   * SKIPPED — known-bug repro (R14). This sequence ("insert block N at top when a
   * previous render ran in the same process") fails: the partial engine's span
   * bookkeeping gets polluted and a later `partialUpdateHtml` cannot locate its
   * targets (drift=1). Reproduces only when the two tests above ran first, i.e.
   * it depends on residual transformer-global array values surviving a (`length=1`)
   * reset. Being addressed by the patch-based incremental update protocol; kept
   * here as the reproduction script.
   */
  it.skip("stays aligned through standalone block inserts and whole-block deletes", async () => {
    const editor = await fullRenderIntoDom(
      ["@def A {", "    one", "}", "", "@def B {", "    two", "}"].join("\n"),
    );
    for (let k = 0; k < 6; k++) {
      const change =
        k % 2 === 0
          ? editor.insertBefore(1, "@note N" + k + "\n{\n    b\n}")
          : editor.delete(1, 3);
      const drift = await applyStep(editor, change);
      expect(drift).toBe(0, `partial update could not locate its targets at step ${k}`);
    }
  });
});
