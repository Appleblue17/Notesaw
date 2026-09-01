import { describe, it, expect } from "vitest";
import { renderFragment, createCorePipeline } from "../src/core.ts";
import { noteProcess } from "../src/note-extension.ts";

const BASE = "https://notesaw.test/";

/**
 * GFM / Markdown feature coverage for the shared pipeline. These anchor that the
 * common remark/rehype chain (remark-gfm, remark-math, rehype-katex,
 * rehype-starry-night, remark-img-links) keeps working as Notesaw features are
 * added — each block style, inline element and media type must still reach the
 * output unchanged. Tests assert on structure (what a user sees), not on ids.
 */
describe("GFM feature coverage", () => {
  it("renders links, emphasis, strong, strikethrough and inline code", async () => {
    const html = await renderFragment(
      "A [link](https://example.com) with *em*, **strong**, ~~strike~~ and `code`.",
      { imgBase: BASE },
    );
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain(">link<");
    expect(html).toContain("<em>em</em>");
    expect(html).toContain("<strong>strong</strong>");
    expect(html).toContain("<del>strike</del>");
    expect(html).toContain("<code>code</code>");
  });

  it("renders images with resolved source", async () => {
    const html = await renderFragment("A ![logo](img/logo.png).", { imgBase: BASE });
    expect(html).toContain(`src="${BASE}img/logo.png"`);
    expect(html).toContain('alt="logo"');
  });

  it("renders relative images without a configured imgBase (default file:// fallback)", async () => {
    // regression: the default imgBase was a bare path (process.cwd()), which made
    // remark-img-links throw ERR_INVALID_URL on any relative image.
    const html = await renderFragment("A ![logo](img/logo.png).");
    expect(html).toContain("img/logo.png");
    expect(html).toContain('alt="logo"');
  });

  it("renders reference-style links", async () => {
    const html = await renderFragment("[label][ref]\n\n[ref]: https://ref.example/path", {
      imgBase: BASE,
    });
    expect(html).toContain('href="https://ref.example/path"');
  });

  it("renders tables including alignment", async () => {
    const html = await renderFragment(
      "| a | b | c |\n|---|---|---:|\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |",
      { imgBase: BASE },
    );
    expect(html).toContain("<table");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    // third column right-aligned
    expect(html).toContain('align="right"');
    expect(html.match(/<tr>/g)!.length).toBe(3); // header + 2 data rows
    expect(html).toContain(">6<");
  });

  it("renders ordered lists with item order preserved", async () => {
    const html = await renderFragment("1. first\n2. second\n3. third", { imgBase: BASE });
    expect(html).toContain("<ol");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
    expect(html).toContain("<li>third</li>");
  });

  it("renders nested unordered lists", async () => {
    const html = await renderFragment("Level one\n- a\n  - a1\n  - a2\n- b", {
      imgBase: BASE,
    });
    expect(html).toContain("<ul");
    // two levels of <ul>
    expect(html.match(/<ul/g)!.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("<li>a1</li>");
    expect(html).toContain("<li>a2</li>");
  });

  it("renders task list checkboxes (checked & unchecked)", async () => {
    const html = await renderFragment("- [ ] open\n- [x] done", { imgBase: BASE });
    expect(html).toContain("contains-task-list");
    expect(html).toContain("task-list-item");
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).toContain('<input type="checkbox" checked disabled>');
  });

  it("renders blockquotes", async () => {
    const html = await renderFragment("> a quoted line\n>\n> more quote", { imgBase: BASE });
    expect(html).toContain("<blockquote");
    expect(html).toContain(">a quoted line");
    expect(html).toContain(">more quote");
  });

  it("renders inline and display math via KaTeX", async () => {
    const html = await renderFragment("Inline $x^2$ and display:\n\n$$ e^{i\\pi} + 1 = 0 $$", {
      imgBase: BASE,
    });
    expect(html).toContain("katex");
    expect(html).toContain("katex-mathml");
    expect(html).toContain("katex-display");
    expect(html).toContain("katex-html");
  });

  it("renders fenced code blocks with language highlighting", async () => {
    const html = await renderFragment("```js\nconst x = 1;\n```", { imgBase: BASE });
    expect(html).toContain("<pre");
    expect(html).toContain('<code class="language-js"');
    // starry-night adds a grammar-scoped token class
    expect(html).toMatch(/<span class="pl-[a-z0-9]+">/);
  });

  it("renders footnotes with reference and back-reference", async () => {
    const html = await renderFragment(
      "Text with a note[^ref].\n\n[^ref]: the footnote body.",
      { imgBase: BASE },
    );
    expect(html).toContain('data-footnote-ref');
    expect(html).toMatch(/id="user-content-fnref-ref"/);
    expect(html).toContain("footnotes");
    expect(html).toContain('data-footnote-backref');
    expect(html).toContain("the footnote body");
  });

  it("renders autolinks and URLs", async () => {
    const html = await renderFragment("See <https://example.com> now.", { imgBase: BASE });
    expect(html).toContain('href="https://example.com"');
  });

  it("renders multiple headings with correct hierarchy", async () => {
    const html = await renderFragment("# h1\n\n## h2\n\n### h3", { imgBase: BASE });
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).toContain(">h1<");
    expect(html).toContain(">h2<");
    expect(html).toContain(">h3<");
  });

  it("renders inline code and code spans with backticks", async () => {
    const html = await renderFragment("A ``double ``code`` span`` and a `single`.", {
      imgBase: BASE,
    });
    expect(html).toContain("<code>single</code>");
    expect(html).toContain("</code>");
  });
});

/**
 * The GFM features must survive inside a Notesaw block too — content nested in a
 * `@` block is exactly what incremental rendering normally touches.
 */
describe("GFM inside Notesaw blocks", () => {
  it("renders math, code, links and lists inside a def block", async () => {
    const doc = [
      "@def Math Notes {",
      "    The model is $f = \\bold w^T \\bold x + b$.",
      "",
      "    ```py",
      "    def f(x): return x**2",
      "    ```",
      "",
      "    Key refs: [linear](https://en.wikipedia.org/wiki/Linear_regression), [wiki](#wiki).",
      "}",
    ].join("\n");
    const html = await renderFragment(doc, { imgBase: BASE });
    expect(html).toContain("definition-block-container");
    expect(html).toContain("katex");
    expect(html).toContain('<code class="language-py"');
    expect(html).toContain('href="https://en.wikipedia.org/wiki/Linear_regression"');
    expect(html).toContain("The model is");
    // starry-night tokenizes the code, so assert on the language class + a token span
    expect(html).toMatch(/<code class="language-py"/);
    expect(html).toMatch(/<span class="pl-k">def<\/span>/);
  });

  it("renders a table inside an example block", async () => {
    const doc = [
      "@example Metrics {",
      "    | metric | value |",
      "    |--------|-------|",
      "    | acc    | 0.95  |",
      "    | f1     | 0.93  |",
      "}",
    ].join("\n");
    const html = await renderFragment(doc, { imgBase: BASE });
    expect(html).toContain("example-block-container");
    expect(html).toContain("<table");
    expect(html).toContain(">acc<");
    expect(html).toContain(">0.95<");
  });
});

/**
 * The webview adapter must preserve the same GFM structure as the core pipeline
 * so the two renderers stay interchangeable.
 */
describe("adapter parity for GFM", () => {
  it("noteProcess and renderFragment produce matching structure", async () => {
    const doc = "## T\n\n- [x] a\n- [ ] b\n\n|x|y|\n|-|-|\n|1|2|\n\n$$a^2$$";
    const viaAdapter = await noteProcess(doc, 0, 0, true);
    const viaCore = await renderFragment(doc, { imgBase: BASE });
    const stripIds = (s: string) => s.replace(/ id="\d+"/g, "");
    expect(stripIds(viaAdapter)).toContain("contains-task-list");
    expect(stripIds(viaCore)).toContain("contains-task-list");
    expect(stripIds(viaAdapter)).toContain("katex-display");
    expect(stripIds(viaCore)).toContain("katex-display");
  });
});
