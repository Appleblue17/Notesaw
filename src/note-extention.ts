/**
 * @file Markdown note processor with custom extensions
 *
 * This is a wrapper of the whole Notesaw pipeline. It processes a note document, converting it to HTML,
 */

import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import { unified } from "unified";
import remarkImgLinks from "@pondorasti/remark-img-links";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeDocument from "rehype-document";
import rehypeStringify from "rehype-stringify";
import { workspaceUri } from "./env.ts";

import fs from "fs";
import prettyPrint from "./utils/prettyprint.ts";
import noteParsePlugin, { noteBoxParsePlugin } from "./parser.ts";
import { noteTransformPlugin } from "./transformer.ts";
import { NoteNode } from "./index.ts";

/**
 * Generate an initial HTML document (framework) without content.
 *
 * @param noteCssUri - URI to the note CSS stylesheet
 * @param ghmCssUri - URI to the GitHub Markdown CSS stylesheet
 * @param katexCssUri - URI to the KaTeX CSS stylesheet
 * @param featherSvgPath - Path to the Feather SVG icon file
 * @param morphdomUri - URI to the morphdom library
 * @param webviewScriptUri - URI to the webview script
 * @param cspSource - Content Security Policy source
 */
export async function noteProcessInit(
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
    .use(remarkRehype) // Convert Markdown parts to HTML
    .use(rehypeDocument, {
      css: [noteCssUri, ghmCssUri, katexCssUri],
      js: [morphdomUri, webviewScriptUri],
      meta: [
        {
          "http-equiv": "Content-Security-Policy",
          content: `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src ${cspSource}; img-src ${cspSource};`,
        },
      ],
    })
    .use(rehypeStringify) // Stringify the final HTML
    .process("");

  const htmlString = String(vfile);

  // Read and inject SVG sprite for icons
  const svgContent = fs.readFileSync(featherSvgPath, "utf8");

  // Insert the SVG sprite into the HTML before closing body tag
  const bodyCloseTag = "</body>";
  const svgTag = `<div style="display:none">${svgContent}</div>\n`;

  const finalHtml = htmlString.replace(bodyCloseTag, svgTag + bodyCloseTag);
  return finalHtml;
}

export async function noteProcess(
  doc: string,
  baseLine: number,
  fatherId: number,
  labelRoot: boolean
): Promise<String> {
  console.log("workspaceUri:", workspaceUri);
  // Create a single unified processor with all plugins
  const html = await unified()
    .use(noteParsePlugin)
    .use(noteBoxParsePlugin)
    .use(remarkImgLinks, { absolutePath: workspaceUri + "/" })
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(noteTransformPlugin, baseLine, fatherId, labelRoot)
    .use(rehypeStringify)
    .process(doc);

  return String(html);
}
