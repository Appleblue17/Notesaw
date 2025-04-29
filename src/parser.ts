import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import type { NoteNode } from "./index.d.ts";

function parseNativeMarkdown(str: string, trailSpaces: number): NoteNode | null {
  const ast = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .parse(trimLeadingSpaces(str, trailSpaces)) as NoteNode;

  if (!ast.children.length) return null;
  ast.type = "markdown";
  return ast;
}

/**
 * Trim leading spaces of given number from the string.
 * @param {string} str
 * @param {number} count
 * @returns {string}
 */
function trimLeadingSpaces(str: string, count: number): string {
  const lines = str.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let trimNum = 0;
    while (trimNum < count && trimNum < lines[i].length && lines[i][trimNum] === " ") trimNum++;
    lines[i] = lines[i].slice(trimNum);
  }
  return lines.join("\n");
}

function addHproperties(node: NoteNode, className: string) {
  if (!node.data) {
    node.data = {
      hName: "div",
      hProperties: { class: className },
    };
  } else if (!node.data.hProperties || !node.data.hProperties.class) {
    node.data.hProperties = { class: className };
  } else {
    node.data.hProperties.class += " " + className;
  }
}

export default function noteParsePlugin() {
  // @ts-ignore
  this.parser = parseNote;
}

/**
 * Parse the note text with extended syntax, parse bottom native MD by fromMarkdown, and return the whole AST.
 * @param {string} text
 * @returns {NoteNode}
 */
function parseNote(text: string): NoteNode {
  let line = 1,
    column = 1;
  let input = "";
  const lines: number[] = [],
    columns: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : null;

    if (char === "\n" || char === "\r") input += "\n";
    else input += char;

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
  }

  const getPosition = (index: number) => {
    return {
      line: lines[index],
      column: columns[index],
      offset: index,
    };
  };

  const blockBeginParserGenerator = (abbr: string, full: string) => {
    /**
     * Parse the block begin syntax.
     *
     * Syntax: `'+'? '@def' [?!*]? ( ' '+ defName ' '* )? '{'`
     *
     * @param {number} beginIndex The starting index to parse the syntax.
     * @returns `null` if match failed; `{ endIndex, matchNode: {type, title, style, children} }` if match succeeded, where `index` is the ending index of the match, and `matchNode` is the AST NoteNode.
     */
    const parseBlockBegin = (
      beginIndex: number
    ): null | { endIndex: number; matchNode: NoteNode } => {
      let index = beginIndex,
        style: string | null = null,
        isLink = false;
      const blockChildren: NoteNode[] = [];

      const ok = () => {
        return {
          endIndex: index,
          matchNode: {
            type: abbr + "-block",
            children: blockChildren,
            position: {
              start: getPosition(beginIndex),
              end: getPosition(index),
            },
            data: {
              hName: "div",
              hProperties: {
                class: full + "-block-mdast" + (isLink ? " block-link" : ""),
              },
            },
            style: style,
            isLink: isLink,
            state: "body",
          },
        };
      };
      const nok = () => null;
      return checkPosition();

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
        const str = "@" + abbr;
        for (let i = 0; i < str.length; i++) {
          if (input[index + i] !== str[i]) return nok();
        }
        index += str.length;
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
        const parsedTitle = parseNativeMarkdown(input.slice(start, index), 0);
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

    return parseBlockBegin;
  };

  /**
   * Parse the block separator syntax.
   *
   * Syntax: `^( *)={3,}( *)$`
   *
   * @param {number} beginIndex The starting index to parse the syntax.
   * @returns `null` if match failed; `{ endIndex, matchNode: {type} }` if match succeeded.
   */
  const blockSeparatorParser = (
    beginIndex: number
  ): null | { endIndex: number; matchNode: NoteNode } => {
    let index = beginIndex;
    const ok = () => ({
      endIndex: index,
      matchNode: {
        type: "block-separator",
        children: [],
      },
    });
    const nok = () => null;
    return checkPosition();

    /**
     * We only match the equal sign at the begining of the line (after the indentation).
     */
    function checkPosition() {
      if (columns[index] !== indentLevel * 4 + 1) return nok();
      return parseBlockSeparator();
    }

    function parseBlockSeparator() {
      let equalCount = 0;
      while (index < input.length && input[index] === "=") {
        equalCount++;
        index++;
      }
      if (equalCount < 3) return nok();

      while (index < input.length && input[index] !== "\n") {
        if (input[index] !== " ") return nok();
        index++;
      }
      return checkPreviousChars();
    }

    /**
     * Check that the previous characters after the last line brake are all spaces.
     */
    function checkPreviousChars() {
      let forwardIndex = beginIndex - 1;
      while (forwardIndex >= 0 && input[forwardIndex] !== "\n") {
        if (input[forwardIndex] !== " ") return nok();
        if (!forwardIndex) break;
        forwardIndex--;
      }
      return ok();
    }
  };

  const parseAxiomBlockBegin = blockBeginParserGenerator("axiom", "axiom");
  const parseTheoremBlockBegin = blockBeginParserGenerator("thm", "theorem");
  const parseProofBlockBegin = blockBeginParserGenerator("proof", "proof");
  const parseLemmaBlockBegin = blockBeginParserGenerator("lemma", "lemma");
  const parseLawBlockBegin = blockBeginParserGenerator("law", "law");
  const parsePropBlockBegin = blockBeginParserGenerator("prop", "proposition");
  const parseCorBlockBegin = blockBeginParserGenerator("cor", "corollary");

  const parseDefBlockBegin = blockBeginParserGenerator("def", "definition");
  const parseNoteBlockBegin = blockBeginParserGenerator("note", "note");
  const parseRemarkBlockBegin = blockBeginParserGenerator("remark", "remark");
  const parseExampleBlockBegin = blockBeginParserGenerator("example", "example");
  const parseProblemBlockBegin = blockBeginParserGenerator("problem", "problem");
  const parseSolutionBlockBegin = blockBeginParserGenerator("solution", "solution");

  // special styling
  const parseWarnBlockBegin = blockBeginParserGenerator("warn", "warning");
  const parseVarsBlockBegin = blockBeginParserGenerator("vars", "variables");
  // const parseTodoBlockBegin = blockBeginParserGenerator("todo");
  // const parseQuoteBlockBegin = blockBeginParserGenerator("quote");
  const parseCustomBlockBegin = blockBeginParserGenerator("block", "custom");

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
      update(parseDefBlockBegin(index));
      update(parseAxiomBlockBegin(index));
      update(parseTheoremBlockBegin(index));
      update(parseLawBlockBegin(index));
      update(parseProofBlockBegin(index));
      update(parseLemmaBlockBegin(index));
      update(parsePropBlockBegin(index));
      update(parseCorBlockBegin(index));

      update(parseNoteBlockBegin(index));
      update(parseRemarkBlockBegin(index));
      update(parseExampleBlockBegin(index));
      update(parseProblemBlockBegin(index));
      update(parseSolutionBlockBegin(index));

      update(parseWarnBlockBegin(index));
      update(parseVarsBlockBegin(index));
      // update(parseTodoBlockBegin(index));
      // update(parseQuoteBlockBegin(index));
      update(parseCustomBlockBegin(index));
    } else if (char === "=") {
      update(blockSeparatorParser(index));
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

      const ast: NoteNode | null = parseNativeMarkdown(input.slice(last, index), indentLevel * 4);
      if (parentNode.type === "root") {
        if (ast) parentNode.children.push(ast);
      } else if (parentNode.type.endsWith("-block")) {
        if (ast) {
          addHproperties(ast, "block-" + parentNode.state + "-mdast");
          parentNode.children.push(ast);
        }
      }

      if (selfNode.type.endsWith("-block")) {
        indentLevel++;

        if (parentNode.type.endsWith("-block")) {
          addHproperties(selfNode, "block-" + parentNode.state + "-mdast");
        }
        parentNode.children.push(selfNode);
        blockStack.push({ node: selfNode, current: endIndex });
      } else if (selfNode.type === "block-separator") {
        if (parentNode.state === "body") {
          parentNode.state = "extend";
        }
      }

      index = endIndex;
      blockStack[blockStack.length - 1].current = index;
    } else {
      if (char === "}" && columns[index] === (indentLevel - 1) * 4 + 1) {
        if (blockStack.length > 1) {
          const { node: selfNode, current: last } = blockStack.pop()!;

          if (selfNode) {
            const ast = parseNativeMarkdown(input.slice(last!, index), indentLevel * 4);
            if (selfNode.type.endsWith("-block")) {
              if (ast) {
                addHproperties(ast, "block-" + selfNode.state + "-mdast");
                selfNode.children.push(ast);
              }
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
  const ast = parseNativeMarkdown(input.slice(last, length), indentLevel * 4);
  if (ast) node.children.push(ast);
  blockStack[0].node.position!.end = getPosition(length);

  return blockStack[0].node;
}
