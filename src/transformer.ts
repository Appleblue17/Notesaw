/**
 * @file
 * This module provides a transformation plugin for converting specialized markdown blocks into HTML elements with appropriate styling and icons. It handles various academic and  informational block types (e.g., theorems, definitions, notes) by applying consistent  styling and iconography based on block type.
 */
import { visit } from "unist-util-visit";

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

/**
 * Creates a remark/rehype plugin that transforms specially marked blocks in AST.
 */
export function noteTransformPlugin() {
  return function transformer(tree: Element) {
    return transformNote(tree);
  };
}

function updatePosition(node: Element) {
  if (node.children && node.children.length > 0) {
    const start = node.children[0].position?.start;
    const end = node.children[node.children.length - 1].position?.end;

    if (start && end) {
      node.position = {
        start,
        end,
      };
    }
  }
}

const iconMap: Record<string, string> = {
  axiom: "check-circle",
  theorem: "bookmark",
  proof: "edit-3",
  lemma: "layers",
  law: "tool",
  proposition: "file-text",
  corollary: "corner-right-down",
  def: "compass",
  definition: "compass",
  note: "bookmark",
  remark: "message-circle",
  example: "list",
  problem: "help-circle",
  solution: "check",
  warning: "alert-triangle",
  variables: "list",
};

let counter = 0;
export const map: number[] = [],
  mapFather: number[] = [-1],
  mapDepth: number[] = [-1],
  mapStartLine: number[] = [-1],
  mapEndLine: number[] = [-1];

function getNewId(): number {
  counter++;
  return counter;
}
function extendMapArray(totalLines: number) {
  if (totalLines > map.length) {
    map.length = totalLines + 1;
    for (let i = map.length; i <= totalLines; i++) map[i] = 0;
  }
}

/**
 * Transforms the AST by finding special block elements and converting them to styled HTML with appropriate structure and icons.
 * @param {Element} tree - The syntax tree to transform
 */
function transformNote(tree: Element) {
  if (!tree || !tree.children.length) return;
  tree.position = tree.children[0].position;

  visit(tree, "element", (node: Element) => {
    const classNames = node.properties?.["class"]?.toString();
    const classList = classNames?.split(" ");
    for (const className of classList || []) {
      if (className.endsWith("-inline-block-mdast")) {
        handleInlineBlock(node, className);
      } else if (className.endsWith("-block-mdast")) {
        handleBlock(node, className);
      } else if (className.includes("box")) {
        // Box syntax, shown as span
        node.tagName = "span";
      }
    }
  });

  visit(tree, "element", (node: Element) => {
    if (!node.position) return;
    const start = node.position.start,
      end = node.position.end;

    extendMapArray(end.line);

    if (!node.properties || !node.properties.id) {
      const newId = getNewId();
      node.properties = {
        ...node.properties,
        id: newId,
      };
      mapDepth.push(0);
      mapFather.push(0);
      mapStartLine.push(start.line);
      mapEndLine.push(end.line);
    }
    const id: number = Number(node.properties.id);
    const depth = mapDepth[id];

    // Use data property to store custom attributes

    let currentLine = start.line;
    let firstChild = true;
    for (let child of node.children) {
      if (child.type !== "element" || !child.position) continue;
      const childStartLine = child.position.start.line;
      const childEndLine = child.position.end.line;

      const newId = getNewId();
      child.properties = {
        ...child.properties,
        id: newId,
      };
      mapDepth.push(depth + 1);
      mapFather.push(id);
      mapStartLine.push(childStartLine);
      mapEndLine.push(childEndLine);

      if (firstChild) {
        for (let i = currentLine; i < childStartLine; i++) map[i] = id;
        firstChild = false;
      }
      currentLine = child.position.end.line + 1;
    }
    for (let i = currentLine; i <= end.line; i++) map[i] = id;
  });
}

function handleInlineBlock(node: Element, className: string) {
  // Extract block type from class name (removing "-inline-block-mdast" suffix)
  const blockLabel = className.slice(0, -19);
  const blockLabelCap = blockLabel.charAt(0).toUpperCase() + blockLabel.slice(1);

  // Get HSL color based on label hash
  const labelHash = hashString(blockLabel);
  const hslColor = `hsl(${labelHash % 360}, 80%, 70%)`;

  // Apply block container class
  node.properties = {
    class: "inline-block-container " + blockLabel + "-inline-block-container",
    style: `border-left-color: ${hslColor};`,
  };

  // Assign appropriate icons based on block id
  const icon = iconMap[blockLabel] || "chevron-right";
  const iconNode: Element = {
    type: "element",
    tagName: "svg",
    properties: {
      class: "block-icon",
      style: `stroke: ${hslColor};`,
    },
    children: [
      {
        type: "element",
        tagName: "use",
        properties: {
          href: "#" + icon,
        },
        children: [],
      },
    ],
  };
  const labelNode: Element = {
    type: "element",
    tagName: "span",
    properties: {
      class: "block-label",
      style: `color: ${hslColor};`,
    },
    children: [
      {
        type: "text",
        value: blockLabelCap,
      },
    ],
  };
  node.children = [iconNode, labelNode, ...node.children];
  updatePosition(node);
}

function handleBlock(node: Element, className: string) {
  // Extract block type from class name (removing "-block-mdast" suffix)
  const blockLabel = className.slice(0, -12);
  const blockLabelCap = blockLabel.charAt(0).toUpperCase() + blockLabel.slice(1);

  // Get HSL color based on label hash
  const labelHash = hashString(blockLabel);
  const hslColor = `hsl(${labelHash % 360}, 80%, 70%)`;

  // Apply block container class
  node.properties = {
    class: "block-container " + blockLabel + "-block-container",
    style: `border-left-color: ${hslColor};`,
  };

  // Create container elements for different parts of the block
  let titleNode: Element = {
    type: "element",
    tagName: "div",
    properties: {
      class: "block-title",
    },
    children: [] as Element[],
  };

  let bodyNode: Element = {
    type: "element",
    tagName: "div",
    properties: {
      class: "block-body",
    },
    children: [] as Element[],
  };

  // Assign appropriate icons based on block id
  const icon = iconMap[blockLabel] || "chevron-right";
  const iconNode: Element = {
    type: "element",
    tagName: "svg",
    properties: {
      class: "block-icon",
      style: `stroke: ${hslColor};`,
    },
    children: [
      {
        type: "element",
        tagName: "use",
        properties: {
          href: "#" + icon,
        },
        children: [],
      },
    ],
  };
  const labelNode: Element = {
    type: "element",
    tagName: "span",
    properties: {
      class: "block-label",
      style: `color: ${hslColor};`,
    },
    children: [
      {
        type: "text",
        value: blockLabelCap,
      },
    ],
  };
  titleNode.children.push(iconNode);
  titleNode.children.push(labelNode);

  // Distribute child elements to appropriate containers based on their class names
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

  // Construct the final block structure with icon and label
  node.children = [titleNode, bodyNode];

  updatePosition(node);

  // Commented out code for block-link functionality
  // if (classList?.includes("block-link")) {
  //   node.children.unshift({
  //     type: "element",
  //     tagName: "div",
  //     properties: {
  //       class: "block-link-container",
  //     },
  //     children: [
  //       {
  //         type: "element",
  //         tagName: "svg",
  //         properties: {
  //           class: "block-link-line",
  //           width: "4", // Increased width to accommodate the borders
  //           height: "25",
  //           viewBox: "0 0 4 25",
  //           preserveAspectRatio: "none",
  //         },
  //         children: [
  //           // Center gray line
  //           {
  //             type: "element",
  //             tagName: "line",
  //             properties: {
  //               x1: "2",
  //               y1: "0",
  //               x2: "2",
  //               y2: "25",
  //               stroke: "#444444",
  //               "stroke-width": "1.5",
  //               "stroke-dasharray": "1.5,1", // Creates a dashed line effect
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //       {
  //         type: "element",
  //         tagName: "div",
  //         properties: {
  //           class: "block-link-icon-container",
  //         },
  //         children: [
  //           {
  //             type: "element",
  //             tagName: "svg",
  //             properties: {
  //               class: "block-link-icon",
  //             },
  //             children: [
  //               {
  //                 type: "element",
  //                 tagName: "use",
  //                 properties: {
  //                   href: featherPath + "#link",
  //                 },
  //                 children: [],
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     ],
  // });
  // }
}
