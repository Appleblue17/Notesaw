import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

import noteParsePlugin, { noteBoxParsePlugin } from "../src/parser.ts";

function parse(doc: string): any {
  return unified().use(noteParsePlugin).parse(doc);
}

describe("parser: native markdown fallback", () => {
  it("renders a simple paragraph through the full pipeline", async () => {
    const html = await unified()
      .use(noteParsePlugin)
      .use(noteBoxParsePlugin)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process("hello world");
    expect(String(html)).toContain("<p>hello world</p>");
  });

  it("keeps GFM and math support", async () => {
    const html = await unified()
      .use(noteParsePlugin)
      .use(noteBoxParsePlugin)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process("- item one\n- item two\n\n$e=mc^2$");
    expect(String(html)).toContain("<li>item one</li>");
  });
});

describe("parser: block syntax structure", () => {
  it("parses a block as a 'block' node with label-based data", () => {
    const root = parse("@example helloworld\n{\n    Greetings!\n}");
    const block = root.children[0];
    expect(block.type).toBe("block");
    expect(block.data.hName).toBe("div");
    expect(block.data.hProperties.class).toBe("example-block-mdast");
  });

  it("expands abbreviations (thm -> theorem)", () => {
    const root = parse("@thm Pythagoras\n{\n    a^2 + b^2 = c^2\n}");
    const block = root.children[0];
    expect(block.data.hProperties.class).toBe("theorem-block-mdast");
  });

  it("supports the '+' link prefix", () => {
    const root = parse("+@note linked block\n{\n    content\n}");
    const block = root.children[0];
    expect(block.type).toBe("block");
    expect(block.data.hProperties.class).toContain("block-link");
  });

  it("supports optional style symbols ? ! *", () => {
    const root = parse("@note? question style\n{\n    body\n}");
    const block = root.children[0];
    expect(block.style).toBe("?");
  });

  it("does not nest a block whose indent is wrong", () => {
    const root = parse("@example outer {\n  @def inner {\n    x\n  }\n}");
    // the outer block at indent 0 IS recognized
    const outer = root.children.find((n: any) => n.type === "block");
    expect(outer).toBeDefined();
    expect(outer.data.hProperties.class).toBe("example-block-mdast");
    // but the wrongly-indented @def inside must NOT become a nested block node
    const innerBlocks = outer.children.filter(
      (n: any) => n.type === "block",
    );
    expect(innerBlocks).toHaveLength(0);
  });

  it("records sensible positions for a block", () => {
    const root = parse("@example hello\n{\n    world\n}");
    const block = root.children[0];
    expect(block.position.start.line).toBe(1);
    expect(block.position.end.line).toBeGreaterThanOrEqual(3);
  });
});

describe("parser: inline block syntax", () => {
  it("parses an inline block as 'inline-block' node", () => {
    const root = parse("@note **be careful** with indentation.");
    const node = root.children[0];
    expect(node.type).toBe("inline-block");
    expect(node.data.hProperties.class).toBe("note-inline-block-mdast");
  });
});

describe("parser: html pipeline with box", () => {
  it("renders box content through remark-rehype", async () => {
    const doc = "@[GTD] is a productivity method.";
    const html = await unified()
      .use(noteParsePlugin)
      .use(noteBoxParsePlugin)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(doc);
    expect(String(html)).toContain("GTD");
  });
});
