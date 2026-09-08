/**
 * @file Adds presentation chrome to fenced code blocks without changing the
 * parsed Note/block structure, so the feature is identical in the VS Code
 * preview and in exported HTML/PDF.
 *
 * It runs AFTER `rehype-starry-night` (and therefore after the transformer has
 * assigned the stable ids / line maps), and only touches elements that are
 * descendants of an existing, id-bearing `<pre>` / `<code>` — it never adds new
 * siblings at the block level. That keeps the incremental renderer's
 * id-to-line bookkeeping intact: a code region is re-rendered as a unit, so the
 * decorator simply rebuilds the same chrome each time.
 *
 * Three enhancements:
 *   1. optional per-line layout: each source line becomes a `.sn-line` row with
 *      a numbered `.sn-no` column and a `.sn-code` content column,
 *   2. a language label derived from the `language-*` class,
 *   3. a "copy" button (hooked up to the VS Code clipboard from the webview).
 */

import { visit } from "unist-util-visit";

import type { Element, Root, ElementContent } from "hast";

export interface CodeOptions {
  /** Whether code chrome (label/copy) is enabled at all. Defaults to false. */
  enabled?: boolean;
  /** Enable the numbered line layout. Defaults to enabled. */
  lineNumbers?: boolean;
}

const SEARCH = /\r?\n|\r/g;

/** Maps a fence idiom to a display name; falls back to the raw flag. */
const LANGUAGE_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  node: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  cpp: "C++",
  "c++": "C++",
  c: "C",
  cs: "C#",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  java: "Java",
  rb: "Ruby",
  ruby: "Ruby",
  php: "PHP",
  sh: "Shell",
  shell: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  powershell: "PowerShell",
  ps1: "PowerShell",
  html: "HTML",
  xml: "XML",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  json: "JSON",
  jsx: "JSX",
  tsx: "TSX",
  markdown: "Markdown",
  md: "Markdown",
  sql: "SQL",
  dockerfile: "Dockerfile",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  ini: "INI",
  diff: "Diff",
  text: "Text",
  tex: "LaTeX",
};

function languageFromCode(code: Element): string {
  const cls = code.properties?.className;
  const joined = Array.isArray(cls) ? cls.join(" ") : String(cls ?? "");
  const m = joined.match(/\blanguage-([\w#.+-]+)\b/);
  if (!m) return "";
  const flag = m[1];
  return LANGUAGE_NAMES[flag.toLowerCase()] ?? flag;
}

function textContentOf(children: ElementContent[]): string {
  let out = "";
  const push = (node: ElementContent): void => {
    if (node.type === "text") out += node.value;
    else if (node.type === "element") node.children.forEach(push);
  };
  children.forEach(push);
  return out;
}

function createLine(children: ElementContent[], line: number): Element {
  const number = el(
    "span",
    { className: ["sn-no"], dataLineNumber: String(line) },
    [{ type: "text", value: String(line) }],
  );
  const content = el("span", { className: ["sn-code-part"] }, children);
  return el("span", { className: ["sn-line"], dataLineNumber: String(line) }, [number, content]);
}

/**
 * Splits the token children of a highlighted `<code>` element into per-source-line
 * `.sn-line` rows (an adaptation of the official starry-night gutter).
 */
function layoutLines(code: Element): void {
  const children = code.children;
  const rows: Element[] = [];
  let start = 0;
  let startTextRemainder = "";
  let lineNumber = 0;

  const pushRow = (rawChildren: ElementContent[]): void => {
    lineNumber += 1;
    rows.push(createLine(rawChildren, lineNumber));
  };

  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (child.type !== "text") continue;
    let textStart = 0;
    SEARCH.lastIndex = 0;
    let match = SEARCH.exec(child.value);
    while (match) {
      const line = children.slice(start, index) as ElementContent[];
      if (startTextRemainder) {
        line.unshift({ type: "text", value: startTextRemainder });
        startTextRemainder = "";
      }
      if (match.index > textStart) {
        line.push({ type: "text", value: child.value.slice(textStart, match.index) });
      }
      pushRow(line);
      start = index + 1;
      textStart = match.index + match[0].length;
      match = SEARCH.exec(child.value);
    }
    if (start === index + 1) {
      startTextRemainder = child.value.slice(textStart);
    }
  }

  // Any trailing content that was NOT terminated by a newline (rare: a fenced body
  // without a closing line break) becomes a final, non-empty row.
  const tail = children.slice(start);
  if (startTextRemainder) tail.unshift({ type: "text", value: startTextRemainder });
  if (tail.length > 0) pushRow(tail);

  // Drop a phantom empty row that an *ending* newline would otherwise give the
  // last source line: after a terminal terminator there is no further content, so
  // any empty trailing `.sn-line` did not come from a real blank source line.
  const allText = textContentOf(code.children);
  if (rows.length >= 1 && allText.endsWith("\n")) {
    const last = rows[rows.length - 1];
    const lastCodePart = (last.children && (last.children[1] as Element)?.children) || [];
    if (textContentOf(lastCodePart) === "") rows.pop();
  }

  code.children = rows;
}

function addClass(el: Element, extra: string): void {
  const cur = el.properties?.className;
  // hast type: className is `string[]`. Guard against older/no value shapes.
  const list: string[] = Array.isArray(cur)
    ? cur.filter((c): c is string => typeof c === "string")
    : typeof cur === "string" || typeof cur === "number"
      ? [String(cur)]
      : [];
  list.push(extra);
  el.properties = { ...el.properties, className: list };
}

function el(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[] = [],
): Element {
  return { type: "element", tagName, properties, children };
}

function decorate(pre: Element, code: Element, opts: CodeOptions): void {
  const lang = languageFromCode(code);

  if (opts.lineNumbers === true) {
    layoutLines(code);
    addClass(code, "sn-line-num");
  }

  addClass(code, "sn-code");
  if (lang) code.properties = { ...code.properties, "data-sn-lang": lang };

  // The toolbar (language label + copy button) lives *inside* the existing
  // <pre> so it is rebuilt together with the code on every (re-)render.
  addClass(pre, "sn-block");
  const toolChildren: ElementContent[] = [];
  if (lang) {
    toolChildren.push(el("span", { className: ["sn-lang"] }, [{ type: "text", value: lang }]));
  }
  toolChildren.push(
    el("button", { className: ["sn-copy"], type: "button", "aria-label": "Copy code" }, [
      { type: "text", value: "Copy" },
    ]),
  );
  pre.children = [...toolChildren, ...pre.children];
}

/**
 * Rehype plugin: decorate every fenced code block in the tree. Entirely opt-in:
 * when `enabled` is false (the default for bare renders) the tree is left
 * untouched, so existing render tests and the incremental oracle output stay
 * byte-identical.
 */
export default function rehypeNotesawCode(options?: CodeOptions | null) {
  const opts: CodeOptions = options || {};
  return (tree: Root): void => {
    if (opts.enabled !== true) return;
    const decorateOpts: CodeOptions = { enabled: true, lineNumbers: opts.lineNumbers === true };
    visit(tree, "element", (pre: Element) => {
      if (pre.tagName !== "pre" || !pre.children || pre.children.length !== 1) return;
      const only = pre.children[0];
      if (only.type !== "element" || only.tagName !== "code") return;
      if (textContentOf(only.children).trim().length === 0) return;
      decorate(pre, only, decorateOpts);
    });
  };
}
