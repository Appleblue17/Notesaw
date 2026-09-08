## Notesaw Syntax

### Format and Indentation

_Notesaw_ follows a relatively strict formatting and indentation rule. This is to avoid ambiguity and unintentional conflicts with Markdown syntax, and to ensure consistency and readability. Here are some key points to keep in mind:

- Use $4$ spaces or a tab character for indentation.
- Each block should be clearly indented to indicate its hierarchy and relationship to other blocks.
- Block and inline block syntax will only be identified by their indentation level.

### Block Syntax

_Notesaw_ introduces a hierarchical block syntax that allows for flexible document organization. Blocks can be nested and rearranged easily, making it simple to structure your notes. The syntax is:

```plain
'+'? '@' label (' '+ title ' '*)? '{'
    (indented contents)
'}'

* label: [a-z]+
* title: [^\n]+ (\n' '*)?
```

- The `title` is optional and can be omitted if not needed.

- The content must be indented using $4$ spaces or a tab character, and the syntax will only be recognized if its indentation level is correct. See [Format and Indentation](#format-and-indentation).

- The opening curly brace `{` can be either written on the same line as the opening block, or at the beginning of the next line (but an endline must follow then).

- The closing curly brace `}` must be on the same indentation level as the opening block. Any content following the closing brace will be ignored and not rendered.

#### Label Mapping

_Notesaw_ provides a set of pre-defined labels with associated icons for various block types. Label names that are not explicitly defined in the table below will fall back to a default icon (chevron-right).

To make it more convenient, _Notesaw_ set up a set of abbreviations for block labels. If the label name occurs in the table below, then it will be automatically substituted by the corresponding full label name, and so do the color.

See [BLOCKLABEL.md](docs/BLOCKLABEL.md) for the full list of icons and abbreviations.

#### Examples

```text
-> valid

@example helloworld
{
    Greetings!
}
```

````text
-> valid

@def Markdown {
    Markdown is a lightweight markup language for creating formatted text using a plain-text editor.

    @example {
      ```md
      > Hello, *Markdown*!
      ```
    }
}
````

```text
-> invalid (incorrect indentation, the nested definition won't be recognized)

@example nested {
  @def nested {
   This is a nested definition.
  }
}
```

```text
-> invalid (redundant characters after curly braces)

@example greetings
{ abc
    helloworld
} def
```

#### Recommended Usage

Block is a good choice for organizing related content and providing clear structure, but may appear bulky if it contains a lot of text. It is recommended to use blocks to **highlight key concepts**, then explain them in detail outside the block.

You can also wrap related content in a block, such as theorems, proofs, examples, etc., to improve readability and organization.

### Inline Block Syntax

Inline block is the inline version of block, allowing you to add formatting and structure to your text without breaking the flow of your writing. The syntax is:

```plain
'+'? '@' label [?!*]? ' ' content '\n'

* label: [a-z]+
* content: [^\n]*
```

- The inline block must be a single line and cannot contain newlines.

- The syntax will only be recognized if its indentation level is correct. See [Format and Indentation](#format-and-indentation).

- Inline blocks do not support titles for now.

#### Examples

```text
-> valid

@note **Be careful** with the indentation.
```

#### Recommended Usage

Inline blocks are useful for adding emphasis or additional context to specific parts of your text without breaking the flow. It's a good practice to use inline blocks as "additions", a way to highlight important notes, tips, or annotations.

Short definitions or explanations can also be effectively conveyed using inline blocks, more like a light-weighted block.

### Box Syntax

Box is a lightweight, flexible, inline container that can be used to highlight or stress important information or keywords. The syntax is:

```plain
'@[' [^@]* ']'
```

- The content can include text, inline code, and even math expressions, but multi-line content or images are not supported.

- Box syntax **cannot** be nested within other box syntax, but it can be used in other syntactic contexts.

#### Examples

```text
-> valid

@[Markdown]: Markdown is a lightweight markup language for creating formatted text using a plain-text editor.

@[$a^2+b^2=c^2$] is a well-known equation in mathematics.
```

```text
-> valid

@[Markdown]

Markdown is a lightweight markup language for creating formatted text using a plain-text editor.
```

#### Recommended Usage

Box syntax is useful for highlighting important information or keywords within a larger context. There are many potential use cases, including:

- Emphasizing key terms or concepts
- Used as a declaration of definitions or explanations
- A mini heading to separate content without breaking the flow

The example above demonstrates part of the case for using box syntax effectively.