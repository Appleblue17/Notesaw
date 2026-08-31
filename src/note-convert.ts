/**
 * @file Notesaw standalone / converter adapter.
 *
 * Wraps the shared core pipeline (src/core.ts) to produce a fully standalone,
 * self-contained HTML document (used by `export to HTML` and PDF generation).
 */

import rehypeDocument from "rehype-document";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import fs from "fs";

import { createCorePipeline, injectSvgSprite, applyTheme } from "./core.ts";
import { extendMapArray } from "./transformer.ts";

/**
 * Processes a Notesaw document and converts it to a standalone HTML document.
 *
 * @param doc - Raw note document content.
 * @param noteCssPath - Path to the note CSS stylesheet (optional).
 * @param ghmCssPath - Path to the GitHub Markdown CSS stylesheet (optional).
 * @param katexCssPath - Path to the KaTeX CSS stylesheet (optional).
 * @param workspacePath - Base path for resolving relative image links.
 * @param featherSvgPath - Path to the Feather SVG icon file.
 * @param theme - Optional light/dark theme applied via `data-theme`.
 * @returns Promise resolving to the final standalone HTML document.
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

  const cssList = [noteCssPath, ghmCssPath, katexCssPath].filter(
    (uri) => uri !== undefined && uri !== null,
  );

  const vfile = await createCorePipeline({
    imgBase: workspacePath,
    baseLine: 0,
    fatherId: 0,
    labelRoot: true,
  })
    .use(rehypeDocument, { css: cssList as string[] })
    .use(rehypeFormat)
    .use(rehypeStringify)
    .process(doc);

  const htmlString = String(vfile);

  // Read and inject the Feather icon sprite, then apply the theme.
  const svgContent = fs.readFileSync(featherSvgPath, "utf8");
  const finalHtml = applyTheme(injectSvgSprite(htmlString, svgContent), theme);

  return finalHtml;
}
