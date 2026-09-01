import { IncrementalRenderer } from "../../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./render-sim.ts";
import { bootstrapWebview, blockContents, type WebviewHost } from "./webview-dom.ts";

/**
 * A DOM-based incremental oracle. Drives the real incremental engine + webview
 * `partialUpdateHtml` on a jsdom preview, then hands the resulting `.block-container`
 * contents and the clean full-render contents back to the caller for comparison.
 * This is the trustworthy correctness oracle (id-independent, reflects what a user
 * sees); the old span-map fingerprints were not reliable for this purpose.
 */
export class DomOracle {
  renderer: IncrementalRenderer;
  host: WebviewHost;

  constructor() {
    resetEngineState();
    this.renderer = new IncrementalRenderer();
    this.host = bootstrapWebview();
  }

  /** Full-renders `text` into the preview and returns a MockEditor over it. */
  async seed(text: string): Promise<MockEditor> {
    const e = new MockEditor(text);
    this.host.window.document.body.innerHTML = await this.renderer.fullRender(e, true);
    return e;
  }

  /**
   * Applies ONE change incrementally to the DOM. Returns the DOM's `.block-container`
   * contents and the clean full-render contents of the *resulting* document, after
   * re-seeding the main baseline from that document (so each call is an isolated
   * single-step check).
   */
  async singleStep(
    editor: MockEditor,
    change: Parameters<MockEditor["apply"]>[0],
  ): Promise<{ inc: string[]; truth: string[]; drift: number; kind: string }> {
    editor.apply(change);
    const decision = await this.renderer.update(editor, change);
    if (decision.kind === "partial" && decision.raw !== undefined) {
      this.host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
    } else if (decision.kind === "full") {
      // A full decision means the engine opted for a clean re-render; the oracle
      // must apply it to the DOM or the preview would be stale.
      this.host.window.document.body.innerHTML = await this.renderer.fullRender(editor, true);
    }
    const inc = blockContents(this.host.window);
    const drift = this.host.refreshCount();

    // clean full render of the resulting document in isolated state
    resetEngineState();
    const fresh = new IncrementalRenderer();
    const tmp = new MockEditor(editor.text);
    const th = bootstrapWebview();
    th.window.document.body.innerHTML = await fresh.fullRender(tmp, true);
    const truth = blockContents(th.window);

    // re-seed the main baseline from the resulting document for the next step
    this.host.window.document.body.innerHTML = await this.renderer.fullRender(editor, true);

    return { inc, truth, drift };
  }
}

export { blockContents };
