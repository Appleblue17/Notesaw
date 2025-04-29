import { visit } from "unist-util-visit";

import type { NoteNode } from "./index.ts";
import type { Element } from "hast";

export function noteTransformPlugin() {
  return function transformer(tree: Element) {
    return transformNote(tree);
  };
}

function transformNote(tree: Element) {
  console.log("Transforming Note AST");
  visit(tree, "element", (node: Element) => {
    const classNames = node.properties?.["class"]?.toString();
    const classList = classNames?.split(" ");
    for (const className of classList || []) {
      if (className.endsWith("-block-mdast")) {
        const blockType = className.slice(0, -12);
        const blockTypeCap = blockType.charAt(0).toUpperCase() + blockType.slice(1);
        let icon = "";
        switch (blockType) {
          case "axiom":
            icon = "check-circle"; // Represents a fundamental truth
            break;
          case "theorem":
            icon = "book"; // Represents a formal statement
            break;
          case "proof":
            icon = "edit"; // Represents a logical argument
            break;
          case "lemma":
            icon = "layers"; // Represents a supporting proposition
            break;
          case "law":
            icon = "tool"; // Represents a rule or principle
            break;
          case "proposition":
            icon = "file-text"; // Represents a proposed statement
            break;
          case "corollary":
            icon = "corner-right-down"; // Represents a result derived from a theorem
            break;

          case "definition":
            icon = "compass"; // Represents andefinition
            break;
          case "note":
            icon = "bookmark"; // Represents a note or annotation
            break;
          case "remark":
            icon = "message-circle"; // Represents a comment or remark
            break;
          case "example":
            icon = "list"; // Represents an example or instance
            break;
          case "problem":
            icon = "help-circle"; // Represents a problem
            break;
          case "solution":
            icon = "check"; // Represents a solution or answer
            break;

          case "warning":
            icon = "alert-triangle"; // Represents a warning or caution
            break;
          case "variables":
            icon = "list"; // Represents adjustable variables
            break;
          case "custom":
            icon = "settings"; // Represents a custom or configurable block
            break;
        }

        node.properties = {
          class: "block-container " + blockType + "-block-container",
        };

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
        let extendNode: Element = {
          type: "element",
          tagName: "div",
          properties: {
            class: "block-extend",
          },
          children: [] as Element[],
        };

        for (const child of node.children as Element[]) {
          const childClass = child.properties?.["class"]?.toString();
          if (childClass?.includes("block-title-mdast")) {
            titleNode.children.push(child);
          } else if (childClass?.includes("block-body-mdast")) {
            bodyNode.children.push(child);
          } else if (childClass?.includes("block-extend-mdast")) {
            extendNode.children.push(child);
          }
        }

        node.children = [
          {
            type: "element",
            tagName: "div",
            properties: {
              class: "block-icon-container",
            },
            children: [
              {
                type: "element",
                tagName: "svg",
                properties: {
                  class: "block-icon",
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
              },
            ],
          },
          {
            type: "element",
            tagName: "div",
            properties: {
              class: "block-tag-container",
            },
            children: [
              {
                type: "text",
                value: blockTypeCap,
              },
            ],
          },
        ];

        if (bodyNode.children.length > 0) {
          const blockNode: Element = {
            type: "element",
            tagName: "div",
            properties: {
              class: "block-card",
            },
            children: [] as Element[],
          };
          if (titleNode.children.length > 0) blockNode.children.push(titleNode);
          blockNode.children.push(bodyNode);
          node.children.push(blockNode);
        }
        if (extendNode.children.length > 0) node.children.push(extendNode);

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
    }
  });
}
