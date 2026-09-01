/**
 * @file
 * This module provides a transformation plugin for converting specialized markdown blocks into HTML elements with appropriate styling and icons. It handles various academic and  informational block types (e.g., theorems, definitions, notes) by applying consistent  styling and iconography based on block type.
 *
 * The positional bookkeeping is encapsulated in `SpanState` so a renderer can carry
 * its own isolated state (parallel renderers / test-oracle renders no longer clash
 * on shared module globals).
 */
import { visit, SKIP, CONTINUE } from "unist-util-visit";

import type { Element } from "hast";

/**
 * Helper function to generate a hash from a string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export interface SpanSnapshot {
  counter: number;
  map: (number | undefined)[];
  mapFather: number[];
  mapDepth: number[];
  mapStartLine: number[];
  mapEndLine: number[];
}

/**
 * Per-render positional bookkeeping: the line→block `map`, the per-id span arrays,
 * and the id counter. Isolating this lets independent renders (the preview engine
 * and a test-oracle full render) coexist without cross-contamination.
 */
export class SpanState {
  counter = 0;
  map: (number | undefined)[] = [undefined];
  mapFather: number[] = [0];
  mapDepth: number[] = [-1];
  mapStartLine: number[] = [-1];
  mapEndLine: number[] = [-1];

  private getNewId(): number {
    this.counter++;
    return this.counter;
  }

  /** Resets to the initial empty state (mirrors the extension's cleanUp). */
  reset(): void {
    this.counter = 0;
    this.map.length = 1;
    this.map[0] = undefined;
    this.mapFather.length = 1;
    this.mapFather[0] = 0;
    this.mapDepth.length = 1;
    this.mapDepth[0] = -1;
    this.mapStartLine.length = 1;
    this.mapStartLine[0] = -1;
    this.mapEndLine.length = 1;
    this.mapEndLine[0] = -1;
  }

  snapshot(): SpanSnapshot {
    return {
      counter: this.counter,
      map: [...this.map],
      mapFather: [...this.mapFather],
      mapDepth: [...this.mapDepth],
      mapStartLine: [...this.mapStartLine],
      mapEndLine: [...this.mapEndLine],
    };
  }

  extendMapArray(totalLines: number): void {
    if (totalLines > this.map.length - 1) {
      const prevLength = this.map.length;
      this.map.length = totalLines + 1;
      for (let i = prevLength; i <= totalLines; i++) this.map[i] = undefined;
    }
  }

  shrinkMapArray(totalLines: number): void {
    if (totalLines < this.map.length - 1) {
      this.map.length = totalLines + 1;
    }
  }

  /**
   * Ensures the per-id span arrays are large enough to hold index `id`, then
   * records that element's `depth`/`fatherId`/`startLine`/`endLine` at `id`.
   * Writing by explicit index keeps `spanArrays[id] === element id` regardless of
   * prior state (the old `push`-based registration could misassign ids).
   */
  private recordNode(
    id: number,
    depth: number,
    fatherId: number,
    startLine: number,
    endLine: number,
  ): void {
    const need = id + 1;
    if (this.mapDepth.length < need) this.mapDepth.length = need;
    if (this.mapFather.length < need) this.mapFather.length = need;
    if (this.mapStartLine.length < need) this.mapStartLine.length = need;
    if (this.mapEndLine.length < need) this.mapEndLine.length = need;
    this.mapDepth[id] = depth;
    this.mapFather[id] = fatherId;
    this.mapStartLine[id] = startLine;
    this.mapEndLine[id] = endLine;
  }

  /**
   * Transforms the AST by finding special block elements and converting them to
   * styled HTML with appropriate structure and icons.
   */
  transformNote(tree: Element, baseLine: number, fatherId: number, labelRoot: boolean): void {
    if (!tree || !tree.children.length) return;
    tree.position = tree.children[0].position;

    visit(tree, "element", (node: Element) => {
      const classNames = node.properties?.["class"]?.toString();
      const classList = classNames?.split(" ");
      for (const className of classList || []) {
        if (className.endsWith("-inline-block-mdast")) {
          this.handleInlineBlock(node, className);
        } else if (className.endsWith("-block-mdast")) {
          this.handleBlock(node, className);
        } else if (className.includes("box")) {
          node.tagName = "span";
        }
      }
    });

    const isValidElement = (node: Element): boolean => {
      if (!node || node.type !== "element" || !node.position) return false;
      if (!labelRoot && node.properties.class === "markdown-body") return false;
      if (typeof node.properties.class === "string" && node.properties.class.includes("block-body"))
        return false;
      return true;
    };
    const continueTransform = (node: Element) => {
      if (node.tagName === "blockquote") return false;
      if (node.tagName === "ul") return false;
      if (node.tagName === "ol") return false;
      if (node.tagName === "p") return false;
      if (node.tagName === "pre") return false;
      if (node.tagName === "table") return false;
      if (typeof node.properties.class === "string") {
        if (node.properties.class.includes("block-container")) return false;
        if (node.properties.class.includes("box")) return false;
      }
      return true;
    };

    visit(tree, "element", (node: Element) => {
      if (node.type !== "element" || !node.position) return SKIP;
      if (!isValidElement(node)) return CONTINUE;

      const startLine = node.position!.start.line + baseLine,
        endLine = node.position!.end.line + baseLine;

      if (!node.properties || !node.properties.id) {
        const newId = this.getNewId();
        node.properties = { ...node.properties, id: newId };
        this.recordNode(newId, this.mapDepth[fatherId] + 1, fatherId, startLine, endLine);
      }
      const id: number = Number(node.properties.id);
      const depth = this.mapDepth[id];

      let currentLine = startLine;
      let firstChild = true;

      const continueTraversal = continueTransform(node);

      if (continueTraversal) {
        for (let child of node.children) {
          if (child.type !== "element" || !child.position || !isValidElement(child)) continue;
          const childStartLine = child.position.start.line + baseLine;
          const childEndLine = child.position.end.line + baseLine;

          const newId = this.getNewId();
          child.properties = { ...child.properties, id: newId };
          this.recordNode(newId, depth + 1, id, childStartLine, childEndLine);

          if (firstChild) {
            for (let i = currentLine; i < childStartLine; i++) this.map[i] = id;
            firstChild = false;
          }
          currentLine = childEndLine + 1;
        }
      }
      for (let i = currentLine; i <= endLine; i++) this.map[i] = id;

      return continueTraversal ? CONTINUE : SKIP;
    });
  }

  private handleInlineBlock(node: Element, className: string) {
    const blockLabel = className.slice(0, -19);
    const blockLabelCap = blockLabel.charAt(0).toUpperCase() + blockLabel.slice(1);
    const labelHash = hashString(blockLabel);
    const hslColor = `hsl(${labelHash % 360}, 80%, 70%)`;
    node.properties = {
      class: "inline-block-container " + blockLabel + "-inline-block-container",
      style: `border-left-color: ${hslColor};`,
    };
    const icon = iconMap(blockLabel);
    const iconNode: Element = svgIcon(hslColor, icon);
    const labelNode: Element = {
      type: "element",
      tagName: "span",
      properties: { class: "block-label", style: `color: ${hslColor};` },
      children: [{ type: "text", value: blockLabelCap }],
    };
    node.children = [iconNode, labelNode, ...node.children];
    updatePosition(node);
  }

  private handleBlock(node: Element, className: string) {
    const blockLabel = className.slice(0, -12);
    const blockLabelCap = blockLabel.charAt(0).toUpperCase() + blockLabel.slice(1);
    const labelHash = hashString(blockLabel);
    const hslColor = `hsl(${labelHash % 360}, 80%, 70%)`;
    node.properties = {
      class: "block-container " + blockLabel + "-block-container",
      style: `border-left-color: ${hslColor};`,
    };

    const titleNode: Element = {
      type: "element",
      tagName: "div",
      properties: { class: "block-title" },
      children: [],
    };
    const bodyNode: Element = {
      type: "element",
      tagName: "div",
      properties: { class: "block-body" },
      children: [],
    };

    const iconNode: Element = svgIcon(hslColor, iconMap(blockLabel));
    const labelNode: Element = {
      type: "element",
      tagName: "span",
      properties: { class: "block-label", style: `color: ${hslColor};` },
      children: [{ type: "text", value: blockLabelCap }],
    };
    titleNode.children.push(iconNode, labelNode);

    for (const child of node.children as Element[]) {
      const childClass = child.properties?.["class"]?.toString();
      if (childClass?.includes("block-title")) {
        titleNode.children.push(child);
      } else {
        bodyNode.children.push(child);
      }
    }
    updatePosition(titleNode);
    updatePosition(bodyNode);
    node.children = [titleNode, bodyNode];
    updatePosition(node);
  }
}

function updatePosition(node: Element) {
  if (node.children && node.children.length > 0) {
    const start = node.children[0].position?.start;
    const end = node.children[node.children.length - 1].position?.end;
    if (start && end) {
      node.position = { start, end };
    }
  }
}

function svgIcon(stroke: string, icon: string): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: { class: "block-icon", style: `stroke: ${stroke}; fill: transparent` },
    children: [
      {
        type: "element",
        tagName: "use",
        properties: { href: "#" + icon },
        children: [],
      },
    ],
  };
}

function iconMap(label: string): string {
  return iconMapTable[label] || "chevron-right";
}

const iconMapTable: Record<string, string> = {
  axiom: "check-circle",
  theorem: "bookmark",
  proof: "edit-3",
  lemma: "layers",
  law: "tool",
  proposition: "file-text",
  corollary: "corner-right-down",
  def: "compass",
  definition: "compass",
  tip: "info",
  note: "bookmark",
  mark: "bookmark",
  remark: "bell",
  reminder: "bell",
  key: "key",
  example: "list",
  problem: "help-circle",
  solution: "check",
  notice: "alert-circle",
  alert: "alert-triangle",
  warning: "alert-triangle",
  caution: "alert-octagon",
  variables: "list",
  algorithm: "cpu",
  code: "code",
  important: "star",
  remember: "star",
  summary: "star",
  method: "tool",
  extend: "zap",
  extension: "zap",
  discuss: "message-square",
  question: "help-circle",
  exercise: "edit-2",
  reference: "book",
  link: "link",
};

/** Default module-level state, kept so bare callers keep working unchanged. */
export const defaultSpanState = new SpanState();

/**
 * Creates a unified transform plugin. The produced transformer closes over the
 * given `state` (or the module default), so different renders can use isolated
 * `SpanState`s.
 */
export function noteTransformPlugin(state?: SpanState) {
  const s = state ?? defaultSpanState;
  return function makeTransformer(baseLine: number, fatherId: number, labelRoot: boolean) {
    return function transformer(tree: Element) {
      return s.transformNote(tree, baseLine, fatherId, labelRoot);
    };
  };
}

