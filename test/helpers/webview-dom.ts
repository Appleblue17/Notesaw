import { JSDOM } from "jsdom";
import fs from "fs";

export interface WebviewHost {
  dom: JSDOM;
  window: JSDOM["window"];
  posted: any[];
  /** Returns the current count of `requestFullRefresh` messages posted back. */
  refreshCount: () => number;
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
