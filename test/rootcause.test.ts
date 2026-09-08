import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, type WebviewHost } from "./helpers/webview-dom.ts";

/**
 * Behavioural fixes of this scenario:
 *  - inserting a standalone block at the top then deleting it wholesale leaves a
 *    clean DOM ([A, B]) with no ghost/duplicate blocks.
 *  - deleting only the first 3 lines (leaving a stray `}`) correctly renders the
 *    residual `}` as a plain paragraph and does NOT corrupt the neighbouring blocks.
 */
describe("root cause: insert block N at top, then delete it", () => {
  let renderer: IncrementalRenderer;
  let host: WebviewHost;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
    host = bootstrapWebview();
  });

  function domBlocks() {
    const mb = host.window.document.querySelector(".markdown-body");
    return Array.from(mb.childNodes).filter((n: any) => n.nodeType === 1);
  }

  const DOC = ["@def A {", "    one", "}", "", "@def B {", "    two", "}"].join("\n");

  async function seed() {
    const editor = new MockEditor(DOC);
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    return editor;
  }

  async function apply(editor: MockEditor, change: Parameters<MockEditor["apply"]>[0]) {
    editor.apply(change);
    const before = host.refreshCount();
    const decision = await renderer.update(editor, change);
    if (decision.kind === "partial" && decision.raw !== undefined) {
      host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
    }
    return { decision, drift: host.refreshCount() - before };
  }

  it("insert + whole-block delete stays clean (no ghost blocks, no drift)", async () => {
    const editor = await seed();
    await apply(editor, editor.insertBefore(1, "@note N\n{\n    b\n}"));
    expect(domBlocks().map((n: any) => n.id)).toHaveLength(3); // N, A, B

    const { drift } = await apply(editor, editor.delete(1, 4));
    expect(drift).toBe(0);
    expect(domBlocks().map((n: any) => n.id)).toHaveLength(2); // A, B only
  });

  it("deleting only the first 3 lines leaves a stray `}` rendered as text, not corrupting blocks", async () => {
    const editor = await seed();
    await apply(editor, editor.insertBefore(1, "@note N\n{\n    b\n}"));

    const { drift } = await apply(editor, editor.delete(1, 3));
    expect(drift).toBe(0);
    // expect: residual `}` paragraph + A + B
    expect(domBlocks().map((n: any) => n.id)).toHaveLength(3);
  });
});
