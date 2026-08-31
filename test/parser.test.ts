import { describe, it, expect } from "vitest";
import noteParsePlugin, { noteBoxParsePlugin } from "../src/parser.ts";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

/**
 * 冒烟测试：验证 Vitest 能驱动真实的 unified + notesaw parser 管线，
 * 并产出 HTML。这是阶段 C 测试床的起点。
 */
describe("parser smoke", () => {
  it("renders a simple markdown paragraph", async () => {
    const html = await unified()
      .use(noteParsePlugin)
      .use(noteBoxParsePlugin)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process("hello world");
    const out = String(html);
    expect(out).toContain("<p>hello world</p>");
  });

  it("renders a block", async () => {
    const doc = "@example helloworld\n{\n    Greetings!\n}";
    const html = await unified()
      .use(noteParsePlugin)
      .use(noteBoxParsePlugin)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(doc);
    const out = String(html);
    // block node carries the example-block-mdast class before transform turns it into div
    expect(out).toContain("example-block-mdast");
    expect(out).toContain("hello");
  });

  it("renders an inline block", async () => {
    const doc = "@note **be careful** with indentation.";
    const html = await unified()
      .use(noteParsePlugin)
      .use(noteBoxParsePlugin)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(doc);
    const out = String(html);
    expect(out).toContain("note-inline-block-mdast");
  });

  it("renders a box", async () => {
    const doc = "@[Markdown] is a lightweight markup language.";
    const html = await unified()
      .use(noteParsePlugin)
      .use(noteBoxParsePlugin)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(doc);
    const out = String(html);
    expect(out).toContain("Markdown");
  });
});
