import { NoteNode } from "./index.ts";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeDocument from "rehype-document";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";

import prettyPrint from "./utils/prettyprint.ts";
import noteParsePlugin from "./parser.ts";
import { noteTransformPlugin } from "./transformer.ts";

import fs from "fs/promises";

const preprocessMath = (input: string): string => {
  // Ensure all $$...$$ formulas are treated as display mode
  return input.replace(/\$\$([^$]*)\$\$/gs, "$$$$\n$1\n$$$$\n");
};

const doc: string = preprocessMath(await fs.readFile("./test/test.note", "utf-8"));

// console.log(doc);

const vfile = await unified()
  .use(noteParsePlugin) // Custom parser processes raw text first
  .use(() => (ast: NoteNode) => {
    console.log("After remarkParse");
    console.log(prettyPrint(ast)); // Debug intermediate tree
  })
  .use(remarkRehype) // Convert Markdown parts to HTML
  .use(noteTransformPlugin) // Transform custom AST
  .use(rehypeKatex) // Add KaTeX support
  .use(() => (ast: NoteNode) => {
    console.log("After remarkRehype");
    console.log(prettyPrint(ast)); // Debug after custom compiler
  })
  .use(rehypeFormat)
  .use(rehypeDocument, {
    css: [
      "./assets/styles/note.css",
      "./assets/styles/github-markdown.css",
      "./assets/styles/katex.css",
    ],
  })
  .use(rehypeStringify) // Stringify the final HTML
  .process(doc);

console.log(String(vfile));

await fs.writeFile("./output.html", String(vfile), "utf-8");
console.log("HTML exported to output.html");
