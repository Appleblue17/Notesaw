import { describe, it, expect, beforeAll } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";

/** Loads webview-script.js into a fresh JSDOM window with mocked host bridge. */
function bootstrap(mockVscode: { onMessage?: (m: any) => void }) {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { runScripts: "outside-only" });
  const { window } = dom;

  // Host bridge mock.
  const posted: any[] = [];
  window.acquireVsCodeApi = () => ({
    postMessage: (msg: any) => {
      posted.push(msg);
      if (mockVscode.onMessage) mockVscode.onMessage(msg);
    },
  });
  // morphdom stub (not exercised by partialUpdateHtml paths).
  (window as any).morphdom = () => {};

  const src = fs.readFileSync(
    new URL("../assets/script/webview-script.js", import.meta.url),
    "utf-8",
  );
  window.eval(src);
  return { window, posted };
}

beforeAll(() => {
  // ensure jsdom is bundled; nothing to do here
});

describe("webview-script partialUpdateHtml: self-healing fallback", () => {
  it("requests a full refresh when the fat parent is not found", () => {
    const { window, posted } = bootstrap({});
    // markdown-body exists but no element with id '99'
    window.document.body.innerHTML = '<div class="markdown-body"><div id="1"><p>x</p></div></div>';
    window.partialUpdateHtml('<div class="markdown-body"><div id="5">new</div></div>', 2, 3, 99);
    const reqs = posted.filter((m) => m.command === "requestFullRefresh");
    expect(reqs.length).toBeGreaterThan(0);
  });

  it("requests a full refresh when x/y targets are absent", () => {
    const { window, posted } = bootstrap({});
    window.document.body.innerHTML =
      '<div class="markdown-body"><div id="10"><div id="1"><p>a</p></div><div id="2"><p>b</p></div></div></div>';
    // fat=10 exists, but x=7 / y=8 do not -> missing targets
    window.partialUpdateHtml('<div class="markdown-body"><div id="1"><p>a</p></div></div>', 7, 8, 10);
    const reqs = posted.filter((m) => m.command === "requestFullRefresh");
    expect(reqs.length).toBeGreaterThan(0);
  });

  it("applies the new content when all targets are found", () => {
    const { window, posted } = bootstrap({});
    window.document.body.innerHTML =
      '<div class="markdown-body"><div id="10"><div id="1"><p>a</p></div><div id="2"><p>b</p></div></div></div>';
    const newHtml =
      '<div class="markdown-body"><div id="1"><p>a</p></div><div id="3"><p>c</p></div></div>';
    window.partialUpdateHtml(newHtml, 1, 2, 10);
    // no full-refresh request; the range [1..2] was replaced with [1,3]
    expect(posted.filter((m) => m.command === "requestFullRefresh")).toHaveLength(0);
    const parent = window.document.getElementById("10");
    expect(parent).not.toBeNull();
    const childIds = Array.from(parent.childNodes)
      .filter((n: any) => n.id)
      .map((n: any) => n.id);
    expect(childIds).toEqual(["1", "3"]);
  });

  it("replaces a non-trailing range and inserts before the following sibling", () => {
    const { window, posted } = bootstrap({});
    window.document.body.innerHTML =
      '<div class="markdown-body"><div id="10"><div id="1">a</div><div id="2">b</div><div id="4">keep</div></div></div>';
    const newHtml =
      '<div class="markdown-body"><div id="1">a</div><div id="3">replaced</div></div>';
    window.partialUpdateHtml(newHtml, 1, 2, 10);
    expect(posted.filter((m) => m.command === "requestFullRefresh")).toHaveLength(0);
    const childIds = Array.from(window.document.getElementById("10").childNodes)
      .filter((n: any) => n.id)
      .map((n: any) => n.id);
    expect(childIds).toEqual(["1", "3", "4"]);
  });
});
