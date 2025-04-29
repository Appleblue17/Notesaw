import { NoteNode } from "./index.ts";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeDocument from "rehype-document";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";

import fs from "fs";
import prettyPrint from "./utils/prettyprint.ts";
import noteParsePlugin from "./parser.ts";
import { noteTransformPlugin } from "./transformer.ts";

const preprocessMath = (input: string): string => {
  // Ensure all $$...$$ formulas are treated as display mode
  return input.replace(/\$\$([^$]*)\$\$/gs, "$$$$\n$1\n$$$$\n");
};

export default async function noteProcess(
  doc: string,
  noteCssUri: string,
  ghmCssUri: string,
  katexCssUri: string,
  featherSvgPath: string,
  cspSource: string
): Promise<string> {
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
      css: [noteCssUri, ghmCssUri, katexCssUri],
      meta: [
        {
          "http-equiv": "Content-Security-Policy",
          content: `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; img-src ${cspSource} data:; script-src 'unsafe-inline'; connect-src ${cspSource}; media-src ${cspSource}`,
        },
      ],
    })
    .use(rehypeStringify) // Stringify the final HTML
    .process(docWithMath);

  // console.log(String(vfile));
  const htmlString = String(vfile);
  const svgContent = fs.readFileSync(featherSvgPath, "utf8");

  // Insert the SVG sprite into the HTML
  const bodyCloseTag = "</body>";
  const svgTag = `<div style="display:none">${svgContent}</div>\n${bodyCloseTag}`;

  const finalHtml = htmlString.replace(bodyCloseTag, svgTag);
  return finalHtml;
}
