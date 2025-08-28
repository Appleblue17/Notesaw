import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import type { NoteNode } from "./index.d.ts";

/**
 * Plugin function for unified processor.
 * Sets the parser to the custom parseNote function.
 */
export default function noteParsePlugin() {
  // @ts-ignore
  this.parser = parseNote;
}

/**
 * Main note parser function that handles extended syntax.
 * Parses the note text with custom block syntax, processes native markdown,
 * and returns a complete AST (Abstract Syntax Tree).
 *
 * Handles special block types like axioms, theorems, proofs, etc. with their
 * own custom syntax and formatting.
 *
 * @param {string} text - The note text to parse
 * @returns {NoteNode} - The parsed AST representing the note structure
 */
function parseNote(text: string): NoteNode {
  let line = 1,
    column = 1;
  let input = "";
  const lines: number[] = [],
    columns: number[] = [];

  const appendNormalChar = (char: string) => {
    input += char;

    lines.push(line);
    columns.push(column);

    // Normal character
    column++;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : null;

    if (char === "\n" || char === "\r") {
      input += "\n";

      lines.push(line);
      columns.push(column);

      // Handle newlines (CRLF, LF, CR)
      if (char === "\r") {
        if (nextChar === "\n") {
          // CRLF (Windows)
          line++;
          column = 1;
          i++; // Skip the LF
        } else {
          // CR alone (old Mac)
          line++;
          column = 1;
        }
      } else if (char === "\n") {
        // LF (Unix)
        line++;
        column = 1;
      } else {
        // Normal character
        column++;
      }
    } else if (char === "\t") {
      for (let j = 0; j < 4; j++) {
        appendNormalChar(" ");
      }
    } else {
      appendNormalChar(char);
    }
  }

  /**
   * Returns a position object for a given index in the text.
   *
   * @param index - The index in the text for which to get the position
   * @returns A position object containing line, column, and offset information
   * @property {number} line - The line number at the given index
   * @property {number} column - The column number at the given index
   * @property {number} offset - The offset (same as the input index)
   */
  const getPosition = (index: number) => {
    return {
      line: lines[index],
      column: columns[index],
      offset: index,
    };
  };

  /**
   * Parses a markdown string using unified with remark plugins.
   * Converts the string to an AST (Abstract Syntax Tree) representation.
   *
   * @param {string} str - The markdown string to parse
   * @param {number} trailSpaces - Number of leading spaces to trim from each line
   * @returns {NoteNode|null} - The parsed AST with type set to "markdown", or null if empty
   */
  function parseNativeMarkdown(str: string, trailSpaces: number, offset: number): NoteNode | null {
    const lines = str.split("\n");
    const trimNums: number[] = [0],
      mathNums: number[] = [0];
    for (let i = 0; i < lines.length; i++) {
      let trimNum = 0;
      while (trimNum < trailSpaces && trimNum < lines[i].length && lines[i][trimNum] === " ")
        trimNum++;
      lines[i] = lines[i].slice(trimNum);

      trimNums.push(trimNums[trimNums.length - 1] + trimNum);
      mathNums.push(mathNums[mathNums.length - 1]);

      // Match `\$\$([^$]*)\$\$` and replace with `$$\n$1\n$$\n`
      const mathRegex = /\$\$([^$\n]*)\$\$/;
      let match;
      while ((match = mathRegex.exec(lines[i])) !== null) {
        lines[i] = lines[i].replace(mathRegex, "$$$$\n$1\n$$$$\n");
        mathNums.push(mathNums[mathNums.length - 1]);
        mathNums.push(mathNums[mathNums.length - 1] + 1);
        mathNums.push(mathNums[mathNums.length - 1]);
      }
    }
    const trimedLines = lines.join("\n");

    const ast = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .parse(trimedLines) as NoteNode;

    if (!ast.children.length) return null;

    /**
     * Recursively updates position information for all nodes in the AST.
     * Corrects offsets by accounting for the leading spaces that were trimmed
     * and the offset of the current section within the larger document.
     *
     * @param {NoteNode} node - The node to process and update position for
     */
    const traverse = (node: NoteNode) => {
      if (node.position) {
        const startLine = node.position.start.line - mathNums[node.position.start.line - 1] * 3;
        const endLine = node.position.end.line - mathNums[node.position.end.line] * 3;
        const startOffset =
          node.position.start.offset! - mathNums[node.position.start.line - 1] * 3;
        const endOffset = node.position.end.offset! - mathNums[node.position.end.line] * 3;
        const startPos = startOffset + offset + trimNums[startLine];
        const endPos = endOffset + offset + trimNums[endLine];

        node.position.start = getPosition(startPos);
        node.position.end = getPosition(endPos);
      }
      if (!node.children) return;
      for (const child of node.children) {
        traverse(child);
      }
    };

    ast.type = "markdown";
    traverse(ast);
    return ast;
  }

  /**
   * Adds HTML representation properties to a node with the specified class name.
   * This function enhances nodes in the AST with styling information for rendering.
   *
   * @param {NoteNode} node - The node to add HTML properties to
   * @param {string} className - The CSS class name to add to the node
   */
  // function addHproperties(node: NoteNode, className: string) {
  //   if (!node.data) {
  //     node.data = {
  //       hName: "div",
  //       hProperties: { class: className },
  //     };
  //   } else if (!node.data.hProperties || !node.data.hProperties.class) {
  //     node.data.hProperties = { class: className };
  //   } else {
  //     node.data.hProperties.class += " " + className;
  //   }
  // }

  /**
   * Parse the block begin syntax.
   *
   * Syntax: `'+'? '@' label [?!*]? (' '+ defName ' '*)? '{'`
   * label: [a-z]+
   *
   * @param {number} beginIndex The starting index to parse the syntax.
   * @returns `null` if match failed; `{ endIndex, matchNode: {type, title, style, children} }` if match succeeded, where `index` is the ending index of the match, and `matchNode` is the AST NoteNode.
   */
  const parseBlockBegin = (
    beginIndex: number
  ): null | { endIndex: number; matchNode: NoteNode } => {
    let index = beginIndex,
      label = "",
      style: string | null = null,
      isLink = false;
    const blockChildren: NoteNode[] = [];

    const ok = () => {
      console.log("Block parsed successfully:", {
        label,
        style,
        isLink,
      });
      return {
        endIndex: index,
        matchNode: {
          type: "block",
          children: blockChildren,
          position: {
            start: getPosition(beginIndex),
            end: getPosition(index),
          },
          data: {
            hName: "div",
            hProperties: {
              class: label + "-block-mdast" + (isLink ? " block-link" : ""),
            },
          },
          style: style,
          isLink: isLink,
        },
      };
    };
    const nok = () => null;
    return checkPosition();

    // Check the current position against the expected indentation
    function checkPosition() {
      if (columns[index] !== indentLevel * 4 + 1) return nok();
      return parseLinkSymbol();
    }
    function parseLinkSymbol() {
      if (input[index] === "+") {
        isLink = true;
        index++;
      }
      return parseDefIdentifier();
    }
    function parseDefIdentifier() {
      if (input[index] !== "@") return nok();
      index++;

      label = "";
      while (/[a-z]/.test(input[index])) {
        label += input[index];
        index++;
      }

      if (input[index] === " " || input[index] === "{" || input[index] === "\n")
        return parseDefName();
      else return parseDefStyle();
    }
    function parseDefStyle() {
      if (input[index] === "?") {
        style = "?";
        index++;
      } else if (input[index] === "!") {
        style = "!";
        index++;
      } else if (input[index] === "*") {
        style = "*";
        index++;
      } else return nok();
      return parseDefName();
    }
    function parseDefName() {
      if (input[index] !== "{" && input[index] !== " ") return nok();
      const start = index;
      while (input[index] !== "{") {
        if (input[index] === "\n") return nok();
        index++;
        if (index === input.length) return nok();
      }
      const parsedTitle = parseNativeMarkdown(input.slice(start, index), 0, start);
      if (parsedTitle) {
        parsedTitle.data = {
          hName: "div",
          hProperties: { class: "block-title-mdast" },
        };
        blockChildren.push(parsedTitle);
      }
      index++;
      return ok();
    }
  };

  // const parseAxiomBlockBegin = blockBeginParserGenerator("axiom", "axiom");
  // const parseTheoremBlockBegin = blockBeginParserGenerator("thm", "theorem");
  // const parseProofBlockBegin = blockBeginParserGenerator("proof", "proof");
  // const parseLemmaBlockBegin = blockBeginParserGenerator("lemma", "lemma");
  // const parseLawBlockBegin = blockBeginParserGenerator("law", "law");
  // const parsePropBlockBegin = blockBeginParserGenerator("prop", "proposition");
  // const parseCorBlockBegin = blockBeginParserGenerator("cor", "corollary");

  // const parseDefBlockBegin = blockBeginParserGenerator("def", "definition");
  // const parseNoteBlockBegin = blockBeginParserGenerator("note", "note");
  // const parseRemarkBlockBegin = blockBeginParserGenerator("remark", "remark");
  // const parseExampleBlockBegin = blockBeginParserGenerator("example", "example");
  // const parseProblemBlockBegin = blockBeginParserGenerator("problem", "problem");
  // const parseSolutionBlockBegin = blockBeginParserGenerator("solution", "solution");

  // // special styling
  // const parseWarnBlockBegin = blockBeginParserGenerator("warn", "warning");
  // const parseVarsBlockBegin = blockBeginParserGenerator("vars", "variables");
  // // const parseTodoBlockBegin = blockBeginParserGenerator("todo");
  // // const parseQuoteBlockBegin = blockBeginParserGenerator("quote");
  // const parseCustomBlockBegin = blockBeginParserGenerator("block", "custom");

  /* */
  const length = input.length;
  lines.push(line);
  columns.push(column);

  let indentLevel = 0;
  const blockStack: { node: NoteNode; current: number }[] =
    // Stack to keep track of the current block
    [
      {
        node: {
          type: "root",
          children: [],
          position: {
            start: getPosition(0),
            end: getPosition(0),
          },
          data: {
            hName: "div",
            hProperties: { class: "markdown-body" },
          },
        },
        current: 0,
      },
    ];

  for (let index = 0; index < length; ) {
    const char = input[index];

    let match: null | { endIndex: number; matchNode: NoteNode } = null;
    let update = (result: null | { endIndex: number; matchNode: NoteNode }) => {
      if (!match && result) match = result;
    };
    if (char === "@" || char === "+") {
      update(parseBlockBegin(index));
    }

    if (match) {
      const { endIndex, matchNode: selfNode }: { endIndex: number; matchNode: NoteNode } = match;

      if (!blockStack.length) {
        throw new Error("Curly braces are not matched.");
      }
      const lastBlock = blockStack[blockStack.length - 1];
      if (!lastBlock.node) {
        throw new Error("Curly braces are not matched.");
      }
      const parentNode = lastBlock.node;
      const last = lastBlock.current;

      const ast: NoteNode | null = parseNativeMarkdown(
        input.slice(last, index),
        indentLevel * 4,
        last
      );
      if (parentNode.type === "root" || parentNode.type === "block") {
        if (ast) parentNode.children.push(ast);
      }

      if (selfNode.type === "block") {
        indentLevel++;

        parentNode.children.push(selfNode);
        blockStack.push({ node: selfNode, current: endIndex });
      }

      index = endIndex;
      blockStack[blockStack.length - 1].current = index;
    } else {
      if (char === "}" && columns[index] === (indentLevel - 1) * 4 + 1) {
        if (blockStack.length > 1) {
          const { node: selfNode, current: last } = blockStack.pop()!;

          if (selfNode) {
            const ast = parseNativeMarkdown(input.slice(last, index), indentLevel * 4, last);
            if (selfNode.type === "block") {
              if (ast) selfNode.children.push(ast);
              indentLevel--;
            }

            selfNode.position!.end = getPosition(index + 1);
            blockStack[blockStack.length - 1].current = index + 1;
          }
        }
      }
      index++;
    }
  }
  if (blockStack.length > 1) {
    throw new Error("Curly braces are not matched.");
  }
  const { node, current: last } = blockStack[0];
  const ast = parseNativeMarkdown(input.slice(last, length), indentLevel * 4, last);
  if (ast) node.children.push(ast);
  blockStack[0].node.position!.end = getPosition(length);

  return blockStack[0].node;
}
