/**
 * @file Typed access to the extension's `notesaw.*` configuration.
 *
 * Groups the three setting areas — preview theme, scroll synchronisation, and
 * PDF/export options — behind small typed readers so `extension.ts` stops
 * re-implementing per-property defaults at every call site.
 *
 * The `DEFAULT_*` objects mirror the schema defaults declared in
 * `package.json` (`contributes.configuration`). VS Code already injects those
 * schema defaults into `config.get()` for scalar leaves, which makes them the
 * real single source of truth at runtime; these constants are only a safety
 * net for leaves that can legitimately be missing from the returned object
 * (for example an untouched object-valued setting such as `margin`). If you
 * change a default here, update the matching schema default in `package.json`.
 */

import * as vscode from "vscode";

const SECTION = "notesaw";

/** The palette to drive rendering. `undefined` means "follow the OS colour scheme". */
export type PreviewTheme = "light" | "dark" | undefined;

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

/** Raw `theme` setting: "follow-vscode" | "follow-system" | "light" | "dark". */
export function themePreference(): string {
  return vscode.workspace.getConfiguration(SECTION).get<string>("theme") ?? "follow-system";
}

/**
 * Resolves the raw theme preference against the active editor colour theme into
 * the concrete preview palette. Returns `undefined` for `follow-system`, which
 * lets the preview ship without a `data-theme` attribute so its CSS falls back
 * to the OS `prefers-color-scheme`.
 */
export function resolveTheme(colorKind: vscode.ColorThemeKind): PreviewTheme {
  const pref = themePreference();
  if (pref === "light" || pref === "dark") return pref;
  if (pref === "follow-vscode") {
    return colorKind === vscode.ColorThemeKind.Dark ? "dark" : "light";
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Scroll synchronisation
// ---------------------------------------------------------------------------

export type ScrollSyncMode = "instant" | "smooth" | "intelligent";

export interface ScrollSyncSettings {
  mode: ScrollSyncMode;
  /** Fraction of the viewport height used by `intelligent` mode (0–1). */
  threshold: number;
  /** Max pages tolerated before an auto jump instead of a smooth scroll. */
  crossPageThreshold: number;
}

export const DEFAULT_SCROLL_SYNC: Omit<ScrollSyncSettings, "mode"> & { mode: ScrollSyncMode } = {
  mode: "instant",
  threshold: 0.1,
  crossPageThreshold: 1,
};

export function scrollSyncSettings(): ScrollSyncSettings {
  const c = () => vscode.workspace.getConfiguration(SECTION);
  return {
    mode: c().get<ScrollSyncMode>("scrollSync.mode") ?? DEFAULT_SCROLL_SYNC.mode,
    threshold: c().get<number>("scrollSync.intelligentThreshold") ?? DEFAULT_SCROLL_SYNC.threshold,
    crossPageThreshold:
      c().get<number>("scrollSync.scrollCrossPageThreshold") ??
      DEFAULT_SCROLL_SYNC.crossPageThreshold,
  };
}

// ---------------------------------------------------------------------------
// Code block chrome
// ---------------------------------------------------------------------------

/** Whether fenced code blocks show per-line numbers (the label/copy are always on). */
export function codeBlockLineNumbers(): boolean {
  return (
    vscode.workspace.getConfiguration(SECTION).get<boolean>("codeBlock.lineNumbers") ?? true
  );
}

// ---------------------------------------------------------------------------
// PDF / export
// ---------------------------------------------------------------------------

export interface PdfSettings {
  puppeteerPath: string;
  format: string;
  forceWhiteBackground: boolean;
  landscape: boolean;
  margin: { top?: string; bottom?: string; left?: string; right?: string };
  scale: number;
  displayHeaderFooter: boolean;
  headerTemplate: string;
  footerTemplate: string;
}

/** Mirror the schema defaults from `package.json` (see header comment). */
export const DEFAULT_PDF: PdfSettings = {
  puppeteerPath: "",
  format: "A4",
  forceWhiteBackground: false,
  landscape: false,
  margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  scale: 1,
  displayHeaderFooter: true,
  headerTemplate: "",
  footerTemplate:
    '<div style="width:100%; text-align:center; font-size:10px;">   Page <span class="pageNumber"></span> of <span class="totalPages"></span> </div>',
};

export function pdfSettings(): PdfSettings {
  const get = <T>(key: string, fallback: T): T =>
    vscode.workspace.getConfiguration(SECTION).get<T>(`pdfOptions.${key}`) ?? fallback;

  const margin = get<Partial<PdfSettings["margin"]>>("margin", DEFAULT_PDF.margin);
  return {
    puppeteerPath: get("puppeteerPath", DEFAULT_PDF.puppeteerPath),
    format: get("format", DEFAULT_PDF.format),
    forceWhiteBackground: get("forceWhiteBackground", DEFAULT_PDF.forceWhiteBackground),
    landscape: get("landscape", DEFAULT_PDF.landscape),
    margin: { ...DEFAULT_PDF.margin, ...margin },
    scale: get("scale", DEFAULT_PDF.scale),
    displayHeaderFooter: get("displayHeaderFooter", DEFAULT_PDF.displayHeaderFooter),
    headerTemplate: get("headerTemplate", DEFAULT_PDF.headerTemplate),
    footerTemplate: get("footerTemplate", DEFAULT_PDF.footerTemplate),
  };
}
