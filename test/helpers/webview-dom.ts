import { JSDOM } from "jsdom";
import fs from "fs";
import type { IncrementalRenderer, PartialDecision } from "../../src/incremental-renderer.ts";
import type { MockEditor } from "./render-sim.ts";

export interface WebviewHost {
  dom: JSDOM;
  window: JSDOM["window"];
  posted: any[];
  /** Returns the current count of `requestFullRefresh` messages posted back. */
  refreshCount: () => number;
}

export interface DecisionOutcome {
  decision: PartialDecision;
  /** Incremental DOM `.block-container` contents after applying the decision. */
  inc: string[];
  /** # of engine-proactive `kind:"full"` decisions recorded for this step. */
  engineFull: number;
  /** # of webview `requestFullRefresh` messages posted during this step. */
  webviewFull: number;
}

/**
 * Applies an engine decision to a preview host and reports BOTH kinds of full-render
 * fallback so a full fallback is never silently swallowed by a test:
 *   - `engineFull`: the engine returned `kind:"full"` (a proactive give-up).
 *   - `webviewFull`: the webview posted `requestFullRefresh` (partial anchors not found).
 *
 * The caller captures `engineBaseline = renderer.fullFallbackCount` and
 * `webviewBaseline = host.refreshCount()` BEFORE calling (or passes the values from
 * the *previous* step to get deltas for this step).
 */
export async function applyDecisionAndStats(
  renderer: IncrementalRenderer,
  host: WebviewHost,
  editor: MockEditor,
  change: Parameters<MockEditor["apply"]>[0],
  engineBaseline: number,
  webviewBaseline: number,
): Promise<DecisionOutcome> {
  editor.apply(change);
  const decision = await renderer.update(editor, change);
  if (decision.kind === "partial" && decision.raw !== undefined) {
    host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
  } else if (decision.kind === "full") {
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
  }
  const inc = blockContents(host.window);
  return {
    decision,
    inc,
    engineFull: renderer.fullFallbackCount - engineBaseline,
    webviewFull: host.refreshCount() - webviewBaseline,
  };
}


/**
 * Inflates webview-script.js into a fresh JSDOM window with a mocked host bridge,
 * mirroring the real webview. Returns the window plus a record of messages posted
 * back to the extension (a `requestFullRefresh` message means the incremental
 * update failed to locate its targets).
 */
export function bootstrapWebview(): WebviewHost {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    runScripts: "outside-only",
  });
  const { window } = dom;
  const posted: any[] = [];

  window.acquireVsCodeApi = () => ({
    postMessage: (msg: any) => posted.push(msg),
  });
  (window as any).morphdom = (from: any, to: any) => {
    // crude replacement for tests that use updateHtml
    if (from) from.innerHTML = to;
  };

  const src = fs.readFileSync(
    new URL("../../assets/script/webview-script.js", import.meta.url),
    "utf-8",
  );
  window.eval(src);

  return {
    dom,
    window,
    posted,
    refreshCount: () => posted.filter((m) => m.command === "requestFullRefresh").length,
  };
}

/**
 * Ordered text content of every `.block-container` in the preview body — the
 * DOM-level truth that a user actually sees. Used as the correctness oracle for
 * incremental rendering (id-independent, unlike the span arrays).
 */
export function blockContents(window: JSDOM["window"]): string[] {
  const mb = window.document.querySelector(".markdown-body");
  if (!mb) return [];
  return Array.from(mb.querySelectorAll(".block-container")).map((el: any) =>
    el.textContent.replace(/\s+/g, " ").trim(),
  );
}
