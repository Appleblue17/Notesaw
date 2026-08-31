/**
 * @file Notesaw webview adapter.
 *
 * Wraps the shared core pipeline (src/core.ts) for the VS Code webview:
 *  - `noteProcessInit`  builds the webview HTML shell (CSS/JS/CSP framework).
 *  - `noteProcess`      renders a Notesaw document/fragment to a bare HTML snippet.
 */

import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeDocument from "rehype-document";
import rehypeStringify from "rehype-stringify";
import fs from "fs";

import noteParsePlugin from "./parser.ts";
import { workspaceUri } from "./env.ts";
import {
  renderFragment,
  injectSvgSprite,
  applyTheme,
} from "./core.ts";

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
  cspSource: string,
  theme: "light" | "dark" | undefined
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
    .process("### Rendering Notesaw Preview...\n#### Please wait...");

  const htmlString = String(vfile);
  const svgContent = fs.readFileSync(featherSvgPath, "utf8");

  let finalHtml = injectSvgSprite(htmlString, svgContent);
  finalHtml = applyTheme(finalHtml, theme);
  return finalHtml;
}

/**
 * Renders a Notesaw document (or an incremental fragment) to a bare HTML snippet
 * that the webview can merge into the existing preview DOM.
 *
 * Retained as a thin, webview-facing helper over the shared core so the extension's
 * `export to HTML` (which uses a bare fragment) keeps its existing behaviour.
 *
 * @param doc - Source text to render.
 * @param baseLine - Line offset for position mapping (0 for a full document).
 * @param fatherId - Parent block ID the rendered fragments attach under.
 * @param labelRoot - Whether the root markdown-body wrapper should receive an ID.
 */
export async function noteProcess(
  doc: string,
  baseLine: number,
  fatherId: number,
  labelRoot: boolean
): Promise<string> {
  return renderFragment(doc, {
    imgBase: workspaceUri,
    baseLine,
    fatherId,
    labelRoot,
  });
}
