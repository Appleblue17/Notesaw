import { visit } from "unist-util-visit";

import type { NoteNode } from "./index.ts";
import type { Element } from "hast";

const featherPath = "./node_modules/feather-icons/dist/feather-sprite.svg";

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

        const nodeCopy = {
          ...node,
          properties: {
            class: "block " + blockType + "-block",
          },
        };
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
                      href: featherPath + "#" + icon,
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
          nodeCopy,
        ];
      }
    }
  });
}
