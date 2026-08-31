import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { renderFragment, injectSvgSprite, applyTheme } from "../src/core.ts";
import { noteProcess, noteProcessInit } from "../src/note-extension.ts";
import noteProcessConvert from "../src/note-convert.ts";

const FIXTURE_SVG = fileURLToPath(new URL("./fixtures/icons.svg", import.meta.url));

/**
 * Anchors the rendering behaviour of the shared core and both adapters after the
 * stage-B refactor, so that future changes cannot silently alter output.
 */
describe("render core", () => {
  it("renderFragment transforms a block into a styled container with icon and auto color", async () => {
    const doc = "@def Markdown {\n    Markdown is a lightweight markup language.\n}";
    const html = await renderFragment(doc);
    // full core pipeline turns `def-block-mdast` into a styled block-container.
    expect(html).toContain("definition-block-container");
    expect(html).toContain("block-label");
    expect(html).toContain('href="#compass"');
    expect(html).toMatch(/hsl\(\d+, 80%, 70%\)/);
    expect(html).toContain("Markdown is a lightweight markup language.");
  });

  it("renderFragment maps inline blocks and boxes", async () => {
    const doc = "@note **careful** with indentation.\n\n@[GTD] is a method.";
    const html = await renderFragment(doc);
    expect(html).toContain("note-inline-block-container");
    expect(html).toContain("GTD");
  });

  it("webview adapter noteProcess renders the same structure as renderFragment", async () => {
    const doc = "hello *world*\n\n@tip remember this";
    const viaAdapter = await noteProcess(doc, 0, 0, true);
    const viaCore = await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true });
    // id attributes differ (global counter advances between calls), so compare
    // structure by stripping the assigned numeric ids.
    const stripIds = (s: string) => s.replace(/ id="\d+"/g, "");
    expect(stripIds(viaAdapter)).toBe(stripIds(viaCore));
  });

  it("injectSvgSprite inserts sprite before </body>", () => {
    const html = "<html><body><p>x</p></body></html>";
    const out = injectSvgSprite(html, "<svg/>");
    expect(out).toMatch(/<div style="display:none"><svg\/><\/div>\n<\/body>/);
  });

  it("applyTheme is a no-op for undefined theme", () => {
    expect(applyTheme("<body>x</body>", undefined)).toBe("<body>x</body>");
  });

  it("applyTheme adds data-theme to body", () => {
    expect(applyTheme("<body>x</body>", "dark")).toBe('<body data-theme="dark">x</body>');
  });
});

describe("render adapters", () => {
  it("noteProcessInit produces a webview shell with CSP, css and svg sprite", async () => {
    const html = await noteProcessInit(
      "vscode-resource://note.css",
      "vscode-resource://ghm.css",
      "vscode-resource://katex.css",
      FIXTURE_SVG,
      "vscode-resource://morphdom.js",
      "vscode-resource://webview.js",
      "vscode-resource://csp",
      "dark"
    );
    expect(html).toMatch(/<html/);
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain("note.css");
    // svg sprite is injected as a <div style="display:none"><svg ...></div> right before </body>
    expect(html).toMatch(/<div style="display:none"><svg[^>]*>/);
    expect(html).toContain("Rendering Notesaw Preview");
  });

  it("noteProcessConvert produces a standalone document with injected svg", async () => {
    const html = await noteProcessConvert(
      "# Title\n\ntext *here*",
      "/styles/note.css",
      "/styles/ghm.css",
      "/styles/katex.css",
      undefined,
      FIXTURE_SVG,
      "light"
    );
    expect(html).toMatch(/<html/);
    // rehype-format pretty-prints with indentation and adds ids
    expect(html).toMatch(/<h1[^>]*>Title<\/h1>/);
    expect(html).toMatch(/<div style="display:none"><svg[^>]*>/);
    expect(html).toContain('/styles/note.css');
    expect(html).toContain('data-theme="light"');
  });
});
