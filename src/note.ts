/**
 * @file Markdown note processor with custom extensions
 *
 * This is a wrapper of the whole Notesaw pipeline. It processes a note document, converting it to HTML,
 */

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

/**
 * Preprocesses mathematical formulas in the document
 *
 * Ensures that all double-dollar enclosed math expressions ($$...$$)
 * are properly formatted for display mode math rendering.
 *
 * @param input - Raw document text containing math formulas
 * @returns String with properly formatted math expressions
 */
const preprocessMath = (input: string): string => {
  // Ensure all $$...$$ formulas are treated as display mode
  return input.replace(/\$\$([^$]*)\$\$/gs, "$$$$\n$1\n$$$$\n");
};

/**
 * Processes a note document and converts it to HTML
 *
 * This function processes the markdown note through a pipeline of transformations:
 * 1. Preprocesses math formulas
 * 2. Parses the document using custom note parser
 * 3. Converts markdown to HTML
 * 4. Transforms custom note elements
 * 5. Renders math expressions with KaTeX
 * 6. Formats and finalizes the HTML document
 * 7. Injects SVG icons
 *
 * @param doc - Raw note document content
 * @param noteCssUri - URI to the note CSS stylesheet
 * @param ghmCssUri - URI to the GitHub Markdown CSS stylesheet
 * @param katexCssUri - URI to the KaTeX CSS stylesheet
 * @param featherSvgPath - Path to the Feather SVG icon file
 * @param cspSource - Content Security Policy source
 * @returns Promise resolving to the final HTML document
 */
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
          content: `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}`,
        },
      ],
    })
    .use(rehypeStringify) // Stringify the final HTML
    .process(docWithMath);

  // console.log(String(vfile));
  const htmlString = String(vfile);

  // Read and inject SVG sprite for icons
  const svgContent = fs.readFileSync(featherSvgPath, "utf8");

  // Insert the SVG sprite into the HTML before closing body tag
  const bodyCloseTag = "</body>";
  const svgTag = `<div style="display:none">${svgContent}</div>\n${bodyCloseTag}`;

  const finalHtml = htmlString.replace(bodyCloseTag, svgTag);
  return finalHtml;
}
