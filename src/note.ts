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

const preprocessMath = (input: string): string => {
  // Ensure all $$...$$ formulas are treated as display mode
  return input.replace(/\$\$([^$]*)\$\$/gs, "$$$$\n$1\n$$$$\n");
};

export default async function noteProcess(doc: string) {
  const docWithMath: string = preprocessMath(doc);

  const vfile = await unified()
    .use(noteParsePlugin) // Custom parser processes raw text first
    .use(() => (ast: NoteNode) => {
      // console.log("After remarkParse");
      // console.log(prettyPrint(ast)); // Debug intermediate tree
    })
    .use(remarkRehype) // Convert Markdown parts to HTML
    .use(noteTransformPlugin) // Transform custom AST
    .use(rehypeKatex) // Add KaTeX support
    .use(() => (ast: NoteNode) => {
      // console.log("After remarkRehype");
      // console.log(prettyPrint(ast)); // Debug after custom compiler
    })
    .use(rehypeFormat)
    .use(rehypeDocument, {
      css: [
        "./assets/styles/note.css",
        "./assets/styles/github-markdown.css",
        "./assets/styles/katex.min.css",
      ],
    })
    .use(rehypeStringify) // Stringify the final HTML
    .process(docWithMath);

  // console.log(String(vfile));
  return String(vfile);
  // return "";
}
