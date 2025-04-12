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
  // visit(tree, "element", (node: Element) => {
  //   if (node.properties?.["class"] === "def-block") {
  //     node.children = [
  //       {
  //         type: "element",
  //         tagName: "h3",
  //         properties: {
  //           class: "def-block-title",
  //         },
  //         children: [
  //           {
  //             type: "text",
  //             value: node.properties.title,
  //           },
  //         ],
  //       },
  //       ...node.children,
  //     ];
  //     node.properties = {
  //       class: "def-block",
  //     };
  //   }
  //   // console.log("Here:", node.data);
  // });
}
