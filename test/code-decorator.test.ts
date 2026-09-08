import { describe, it, expect } from "vitest";
import { renderFragment } from "../src/core.ts";
import { DomOracle } from "./helpers/dom-oracle.ts";

const DOC = [
  "```ts",
  "function add(a: number, b: number) {",
  '  return a + b;',
  "}",
  "",
  "const x = add(1, 2);",
  "```",
  "",
  "para with `inline` code.",
].join("\n");

describe("code block chrome (rehype-sourcecode)", () => {
  it("keeps default output byte-identical to plain starry-night (opt-in disabled)", async () => {
    const html = await renderFragment(DOC);
    expect(html).not.toContain("sn-block");
    expect(html).not.toContain("sn-line");
    expect(html).not.toContain("sn-copy");
    // syntax tokens preserved for recognised language
    expect(html).toContain("language-ts");
  });

  it("adds a language label and a copy button when features are on", async () => {
    const html = await renderFragment(DOC, { codeFeatures: true, codeLineNumbers: false });
    expect(html).toContain("sn-block");
    expect(html).toContain("sn-lang");
    expect(html).toContain("TypeScript");
    expect(html).toContain("sn-copy");
    // no line numbers requested
    expect(html).not.toContain("sn-line-num");
  });

  it("wraps each line when codeLineNumbers is on and numbers via data attributes", async () => {
    const html = await renderFragment(DOC, { codeFeatures: true, codeLineNumbers: true });
    expect(html).toContain("sn-line-num");
    // five source lines get a numbered row (plus the number column is real text)
    for (const n of ["1", "2", "3", "4", "5"]) {
      expect(html).toContain(`data-line-number="${n}"`);
    }
    // there is no phantom extra empty row from the trailing newline (no row 6)
    expect(html).not.toContain('data-line-number="6"');
    // source text of each line survives, inside its `sn-code-part` cell
    const stripped = html.replace(/<[^>]*>/g, "");
    expect(stripped).toContain("function add(a: number, b: number) {");
    expect(stripped).toContain("return a + b;");
    expect(stripped).toContain("const x = add(1, 2);");
    // number column is an explicit cell, so copy reads the code part without it
    expect(html).toMatch(/class="sn-no"[^>]*>1<\/span>/);
    expect(html).toContain('class="sn-code-part"');
  });

  it("only decorates fenced blocks, never inline code", async () => {
    const fc = await renderFragment("`inline`", { codeFeatures: true, codeLineNumbers: true });
    expect(fc).not.toContain("sn-copy");
    const fb = await renderFragment("```\nplain here\n```", {
      codeFeatures: true,
      codeLineNumbers: true,
    });
    expect(fb).toContain("sn-copy");
    // no language recognized -> no label span, but chrome still present
    expect(fb).not.toContain("sn-lang");
  });
});

describe("code block chrome + incremental rendering stay consistent", () => {
  function mkOracle() {
    return new DomOracle({ codeFeatures: true, codeLineNumbers: true });
  }

  it("single insertion inside a fenced code block", async () => {
    const init = ["intro", "", "```js", "const a = 1;", "const c = 3;", "```", "", "@def Block {", "    body", "}"].join("\n");
    const oracle = mkOracle();
    const e = await oracle.seed(init);
    const change = e.rawEdit(
      { line: 3, character: 0 },
      { line: 3, character: 0 },
      "const b = 2;\n",
    );
    const { inc, truth } = await oracle.singleStep(e, change);
    expect(inc).toEqual(truth);
  });

  it("delete a whole fenced code line", async () => {
    const init = ["```ts", "const x = 1;", "const y = 2;", "const z = 3;", "```"].join("\n");
    const oracle = mkOracle();
    const e = await oracle.seed(init);
    const change = e.rawEdit({ line: 2, character: 0 }, { line: 3, character: 0 }, "");
    const { inc, truth } = await oracle.singleStep(e, change);
    expect(inc).toEqual(truth);
  });

  it("editing near a code block boundary does not drift", async () => {
    const init = ["## Head", "", "```json", "{ \"a\": 1 }", "```", "", "text after code", "more"].join("\n");
    const oracle = mkOracle();
    const e = await oracle.seed(init);
    const change = e.rawEdit(
      { line: 6, character: 0 },
      { line: 6, character: 0 },
      "insert before after line\n",
    );
    const { inc, truth } = await oracle.singleStep(e, change);
    expect(inc).toEqual(truth);
  });
});
