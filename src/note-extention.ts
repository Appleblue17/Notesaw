/**
 * @file Markdown note processor with custom extensions
 *
 * This is a wrapper of the whole Notesaw pipeline. It processes a note document, converting it to HTML,
 */

import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeDocument from "rehype-document";
import rehypeStringify from "rehype-stringify";

import fs from "fs";
import prettyPrint from "./utils/prettyprint.ts";
import noteParsePlugin, { noteBoxParsePlugin } from "./parser.ts";
import { noteTransformPlugin, map, mapDepth, mapFather } from "./transformer.ts";

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
  const vfile = await unified()
    .use(noteParsePlugin)
    .use(noteBoxParsePlugin)
    .use(remarkRehype) // Convert Markdown parts to HTML
    .use(rehypeKatex) // Add KaTeX support
    .use(noteTransformPlugin) // Transform custom AST
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
    .process(doc);

  const htmlString = String(vfile);

  // Read and inject SVG sprite for icons
  const svgContent = fs.readFileSync(featherSvgPath, "utf8");

  // Insert the SVG sprite into the HTML before closing body tag
  const bodyCloseTag = "</body>";
  const svgTag = `<div style="display:none">${svgContent}</div>\n`;

  const finalHtml = htmlString.replace(bodyCloseTag, svgTag + bodyCloseTag);
  return finalHtml;
}

export async function noteProcessPure(doc: string): Promise<String> {
  // console.time("process");

  // Create a single unified processor with all plugins
  const processor = unified()
    .use(noteParsePlugin)
    .use(noteBoxParsePlugin)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(noteTransformPlugin)
    .use(rehypeStringify);

  // console.time("parsingMDAST");
  const mdast = processor.parse(doc) as MdastRoot;
  // console.timeEnd("parsingMDAST");

  // console.time("parsingHAST");
  const hast = (await processor.run(mdast)) as HastRoot;
  // console.timeEnd("parsingHAST");

  // console.time("stringifyingHAST");
  // Generate the final HTML string
  const html = String(processor.stringify(hast));
  // console.timeEnd("stringifyingHAST");

  // console.timeEnd("process");
  return html;
}
