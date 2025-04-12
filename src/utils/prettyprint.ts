import type { NoteNode } from "../index.js";

const lastChildIndent = "└───",
  childIndent = "├───",
  notChildIndent = "│   ",
  emptyIndent = "    ";
const attrIndent = "│ ",
  emptyAttrIndent = "  ";

function prettyPrintArray(node: NoteNode): string[] {
  const ret: string[] = [];

  let positionStartStr = "???",
    positionEndStr = "???";
  if (node.position) {
    if (node.position.start) {
      const start = node.position.start;
      positionStartStr = start.line + ":" + start.column + ":" + start.offset;
    }
    if (node.position.end) {
      const end = node.position.end;
      positionEndStr = end.line + ":" + end.column + ":" + end.offset;
    }
  }
  const positionStr = "(" + positionStartStr + " - " + positionEndStr + ")";

  if (node.type) {
    ret.push("[" + node.type + "] " + positionStr);
  } else {
    ret.push("[Unknown] " + positionStr);
  }

  const attributeIndent = node.children ? attrIndent : emptyAttrIndent;
  for (const key in node) {
    if (key !== "type" && key !== "children" && key !== "position") {
      if ((node as any)[key] === null) {
        ret.push(attributeIndent + key + ": null");
        continue;
      }
      if (typeof (node as any)[key] === "string") {
        const lines = (node as any)[key].split("\n");
        if (lines.length === 1) ret.push(attributeIndent + key + ": '" + lines[0] + "'");
        else {
          // Multiline, each line starts with a pipe('|')
          ret.push(attributeIndent + key + ": |" + lines[0]);
          const indent = " ".repeat(key.length + 2) + attributeIndent + "|";
          for (let i = 1; i < lines.length; i++) {
            ret.push(indent + lines[i]);
          }
        }
      } else ret.push(attributeIndent + key + ": " + JSON.stringify((node as any)[key]));
    }
  }
  if (node.children) {
    // For each child, add indentation
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childRet = prettyPrintArray(child);

      for (let j = 0; j < childRet.length; j++) {
        const indent =
          i === node.children.length - 1
            ? j === 0
              ? lastChildIndent
              : emptyIndent
            : j === 0
            ? childIndent
            : notChildIndent;
        ret.push(indent + childRet[j]);
      }
    }
  }
  return ret;
}

function prettyPrint(node: NoteNode): string {
  const ret = prettyPrintArray(node);
  const str = ret.join("\n");
  return str;
}

export default prettyPrint;
