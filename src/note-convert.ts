/**
 * @file Markdown note processor with custom extensions
 *
 * This is a wrapper of the whole Notesaw pipeline. It processes a note document, converting it to HTML,
 */

import { unified } from "unified";
import remarkImgLinks from "@pondorasti/remark-img-links";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStarryNight from "rehype-starry-night";
import rehypeStringify from "rehype-stringify";

import fs from "fs";
import prettyPrint from "./utils/prettyprint.ts";
import noteParsePlugin, { noteBoxParsePlugin } from "./parser.ts";
import {
  noteTransformPlugin,
  map,
  mapDepth,
  mapFather,
  mapStartLine,
  mapEndLine,
  extendMapArray,
} from "./transformer.ts";
import rehypeFormat from "rehype-format";
import rehypeDocument from "rehype-document";
import { NoteNode } from "./index.ts";
import { workspaceUri, setWorkspaceUri } from "./env.ts";

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
 * @param noteCssPath - URI to the note CSS stylesheet
 * @param noteCssPath - URI to the GitHub Markdown CSS stylesheet
 * @param noteCssPath - URI to the KaTeX CSS stylesheet
 * @param featherSvgPath - Path to the Feather SVG icon file
 * @returns Promise resolving to the final HTML document
 */
export default async function noteProcessConvert(
  doc: string,
  noteCssPath: string | undefined,
  ghmCssPath: string | undefined,
  katexCssPath: string | undefined,
  workspacePath: string | undefined,
  featherSvgPath: string,
  theme: "light" | "dark" | undefined = "light"
): Promise<string> {
  const totalLines = doc.split("\n").length;
  extendMapArray(totalLines);

  const cssList = [noteCssPath, ghmCssPath, katexCssPath].filter((uri) => uri !== undefined);

  const vfile = await unified()
    .use(noteParsePlugin) // Custom parser processes raw text first
    .use(noteBoxParsePlugin) // Custom parser processes box syntax
    // .use(() => (ast: NoteNode) => {
    //   console.log("After remarkParse");
    //   console.log(prettyPrint(ast)); // Debug intermediate tree
    // })
    .use(remarkImgLinks, { absolutePath: workspacePath + "/" })
    .use(remarkRehype) // Convert Markdown parts to HTML
    .use(rehypeKatex) // Add KaTeX support
    .use(noteTransformPlugin, 0, 0, true) // Transform custom AST
    // .use(() => (ast: NoteNode) => {
    //   console.log("After remarkRehype");
    //   console.log(prettyPrint(ast)); // Debug after custom compiler
    // })
    .use(rehypeStarryNight)
    .use(rehypeDocument, {
      css: cssList,
    })
    .use(rehypeFormat)
    .use(rehypeStringify) // Stringify the final HTML
    .process(doc);

  // console.log("Total lines:", totalLines);
  // console.log("Map:", map);
  // console.log("Map Start Line:", mapStartLine);
  // console.log("Map End Line:", mapEndLine);

  const htmlString = String(vfile);

  // Read and inject SVG sprite for icons
  const svgContent = fs.readFileSync(featherSvgPath, "utf8");

  // Insert the SVG sprite into the HTML before closing body tag
  const bodyCloseTag = "</body>";
  const svgTag = `<div style="display:none">${svgContent}</div>\n`;

  let finalHtml = htmlString.replace(bodyCloseTag, svgTag + bodyCloseTag);

  if (theme) {
    // Add data-theme attribute to <body> tag
    finalHtml = finalHtml.replace(/<body([^>]*)>/, `<body$1 data-theme="${theme}">`);
  }

  return finalHtml;
}
