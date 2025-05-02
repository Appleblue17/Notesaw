/**
 * @file Markdown note processor with custom extensions
 *
 * This is a wrapper of the whole Notesaw pipeline. It processes a note document, converting it to HTML,
 */

import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
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
 * @param morphdomUri - URI to the morphdom library
 * @param webviewScriptUri - URI to the webview script
 * @param cspSource - Content Security Policy source
 * @returns Promise resolving to the final HTML document
 */
export default async function noteProcess(
  doc: string,
  noteCssUri: string,
  ghmCssUri: string,
  katexCssUri: string,
  featherSvgPath: string,
  morphdomUri: string,
  webviewScriptUri: string,
  cspSource: string
): Promise<string> {
  const docWithMath: string = preprocessMath(doc);

  const map: String[] = [];
  const vfile = await unified()
    .use(noteParsePlugin) // Custom parser processes raw text first
    // .use(() => (ast: NoteNode) => {
    //   console.log("After remarkParse");
    //   console.log(prettyPrint(ast)); // Debug intermediate tree
    // })
    .use(remarkRehype) // Convert Markdown parts to HTML
    .use(noteTransformPlugin, map) // Transform custom AST
    .use(rehypeKatex) // Add KaTeX support
    // .use(() => (ast: NoteNode) => {
    //   console.log("After remarkRehype");
    //   console.log(prettyPrint(ast)); // Debug after custom compiler
    // })
    .use(rehypeFormat)
    .use(rehypeDocument, {
      css: [noteCssUri, ghmCssUri, katexCssUri],
      js: [morphdomUri, webviewScriptUri],
      meta: [
        {
          "http-equiv": "Content-Security-Policy",
          content: `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src ${cspSource}`,
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
  const svgTag = `<div style="display:none">${svgContent}</div>\n`;

  const finalHtml = htmlString.replace(bodyCloseTag, svgTag + bodyCloseTag);
  return finalHtml;
}

export async function noteProcessPure(
  doc: string
): Promise<{ html: String; mapLast: String[]; mapNext: String[] }> {
  const docWithMath: string = preprocessMath(doc);
  const map: String[] = [];

  // Create a single unified processor with all plugins
  const processor = unified()
    .use(noteParsePlugin)
    .use(remarkRehype)
    .use(noteTransformPlugin, map)
    .use(rehypeKatex)
    .use(rehypeFormat)
    .use(rehypeStringify);

  // This is a mdast (Markdown AST) Root node
  const mdast = processor.parse(docWithMath) as MdastRoot;
  // console.log("mdast");
  // console.log(prettyPrint(mdast)); // Debug intermediate tree

  const totalLines = mdast.position!.end.line;
  console.log("Total lines in the document: ", totalLines);
  for (let i = 0; i <= totalLines; i++) {
    map.push("");
  }

  // Process the markdown AST to get HTML AST
  const hast = (await processor.run(mdast)) as HastRoot;
  hast.position = mdast.position; // The root original position need to be set manually

  const mapLast = [...map],
    mapNext = [...map];
  for (let i = 1; i < map.length; i++) {
    if (mapLast[i] === "") mapLast[i] = mapLast[i - 1];
  }
  for (let i = map.length - 2; i >= 0; i--) {
    if (map[i] === "") mapNext[i] = mapNext[i + 1];
  }
  // for (let i = 0; i < map.length; i++) {
  //   console.log(i, map[i], mapLast[i], mapNext[i]);
  // }
  // console.log("hast");
  // console.log(prettyPrint(hast)); // Debug intermediate tree
  // Generate the final HTML string
  const html = String(processor.stringify(hast));

  return { html, mapLast, mapNext };
}
