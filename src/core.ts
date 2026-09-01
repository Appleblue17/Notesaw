/**
 * @file Notesaw shared rendering core.
 *
 * Contains the unified pipeline shared by both the VS Code webview renderer
 * (`adapter-webview`) and the standalone/PDF converter (`adapter-standalone`).
 *
 * The core is deliberately free of VS Code / webview concerns and of global
 * mutable state: everything renderable is passed in via `PipelineConfig` so
 * both adapters and, importantly, unit tests can drive exactly the same
 * rendering logic.
 */

import { unified } from "unified";
import remarkImgLinks from "@pondorasti/remark-img-links";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStarryNight from "rehype-starry-night";
import rehypeStringify from "rehype-stringify";

import noteParsePlugin, { noteBoxParsePlugin } from "./parser.ts";
import { noteTransformPlugin, type SpanState } from "./transformer.ts";

export interface PipelineConfig {
  /** Base path used to resolve relative image links (no trailing slash required). */
  imgBase?: string;
  /** Line offset used to map rendered element positions back to the full document. */
  baseLine?: number;
  /** ID of the parent block the rendered fragments are attached to (for incremental rendering). */
  fatherId?: number;
  /** Whether the root markdown-body wrapper should itself be assigned an ID. */
  labelRoot?: boolean;
  /** Optional isolated span state; when provided the transform writes into it. */
  spanState?: SpanState;
}

function normalizeImgBase(imgBase: string | undefined): string {
  if (!imgBase) return process.cwd() + "/";
  return imgBase.endsWith("/") ? imgBase : imgBase + "/";
}

/**
 * Builds a unified processor with the shared Notesaw core plugin chain applied.
 * The chain stops before `rehypeStringify` so each adapter decides whether to
 * emit a bare fragment or wrap it in a full document (via rehype-document/format).
 */
export function createCorePipeline(cfg: PipelineConfig = {}) {
  return unified()
    .use(noteParsePlugin)
    .use(noteBoxParsePlugin)
    .use(remarkImgLinks, { absolutePath: normalizeImgBase(cfg.imgBase) })
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(noteTransformPlugin(cfg.spanState), cfg.baseLine ?? 0, cfg.fatherId ?? 0, cfg.labelRoot ?? false)
    .use(rehypeStarryNight);
}

/** Renders a fragment of Notesaw content to a bare HTML snippet (no document wrapper). */
export async function renderFragment(doc: string, cfg: PipelineConfig = {}): Promise<string> {
  const html = await createCorePipeline(cfg).use(rehypeStringify).process(doc);
  return String(html);
}

/**
 * Injects the Feather icon sprite into an HTML document right before `</body>`.
 * Both the webview and standalone paths perform this identical post-processing.
 */
export function injectSvgSprite(html: string, svgContent: string): string {
  const bodyCloseTag = "</body>";
  const svgTag = `<div style="display:none">${svgContent}</div>\n`;
  return html.replace(bodyCloseTag, svgTag + bodyCloseTag);
}

/**
 * Adds a `data-theme` attribute to the `<body>` element. A `undefined` theme is a
 * no-op (matches the existing behaviour in both pipelines).
 */
export function applyTheme(html: string, theme: "light" | "dark" | undefined): string {
  if (!theme) return html;
  return html.replace(/<body([^>]*)>/, `<body$1 data-theme="${theme}">`);
}
