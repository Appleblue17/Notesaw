# Notesaw Preview

[![Super-Linter](https://github.com/Appleblue17/Notesaw/actions/workflows/lint.yml/badge.svg)](https://github.com/marketplace/actions/super-linter)

_Notesaw_ is an extention of Markdown that is primitively designed for note-taking and documentation, by adding additional features including programming-like block syntax.

_Notesaw Preview_ is a VS Code extension that provides a live preview of _Notesaw_ documents, similar to VS Code's native Markdown preview, but better, faster, and more powerful. The feature set includes stable and precise scroll synchronization, seemingless delay brought by partial rendering, and more.

_Notesaw_ is downward compatible with Markdown, so you may also use it as a drop-in replacement for Markdown preview.

- The block style is inspired by Github Alert's design.

## Table of Contents

- [Features](#features)
- [Get Started](#get-started)
- [Notesaw Syntax](#notesaw-syntax)
- [How does it work?](#how-does-it-work)
- [Known Issues](#known-issues)
- [Change Log](#change-log)
- [References](#references)
- [License](#license)

## Features

**Notesaw Syntax**

- 🗂️ Hierarchical block syntax for flexible document organization
- ✏️ Minimalistic syntax design, easy to learn and use, simple but powerful
- 🧘 Minimalistic style design for distraction-free writing and reading, compatible with native GFM styling
- 🎨 Icons and auto-generated label colors for enhanced visual differentiation
- 👍 Integrated support for GFM and KaTeX
- ✈️ Linear-time complexity for extended syntax processing, as efficient as Markdown

**Notesaw Preview**

- ⚡ Stable and fast for large documents
- 🧠 Intelligent and precise scroll synchronization
- ⏳ Seamless delay brought by partial rendering for improved performance
- 🚀 Instant feedback with no debounce

## Get Started

1. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=Appleblue17.notesaw-preview).
2. Open a Markdown document or create a new one.
3. Click the preview button in the top-right corner of the editor, or use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for "Notesaw: Show Preview". The button should be next to the native Markdown Preview button.
4. Start writing and enjoy the live preview!

### Exporting

You can export your Notesaw document to HTML or PDF format. To do this, open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for "Notesaw: Export to HTML" or "Notesaw: Export to PDF". The exported file will be saved in the same directory as your Notesaw document.

_Notesaw_ Preview uses [Puppeteer](https://pptr.dev/) to generate PDF files, which requires a working installation of Chromium. If you encounter any issues during the export process, please ensure that Chromium is properly installed on your system.

### Extension Settings

You can customize the behavior of _Notesaw Preview_ through the VSCode settings. Press `Ctrl + ,` (or `Cmd + ,` on macOS) to open the settings, and search for "Notesaw" to find the available options.

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

See [BLOCKLABEL.md](BLOCKLABEL.md) for the full list of icons and abbreviations.

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

## How does it work?

_Notesaw_ is built on top of the [unified](https://github.com/unifiedjs/unified) framework/ecosystem, which provides a powerful and flexible way to process and transform Markdown content.

Basically, _Notesaw_ parser linearly sweeps through the document, recognizing and processing extended syntax elements as it goes, which makes it super efficient. The rest of the document is partitioned into pieces and each piece will be processed by [remark](https://github.com/remarkjs) to get the MDAST. _Notesaw_ then merges the MDASTs to the final MDAST, which is then processed into HAST and finally HTML by [rehype](https://github.com/rehypejs/rehype).

During the process, _Notesaw_ maintains the position information of each element which are provided by [remark](https://github.com/remarkjs). These positions are crucial for scroll synchronization between the editor and the preview, as well as partial rendering.

## Known Issues

🧪 **Partial Rendering** is currently an experimental feature and may not work properly. If the preview breaks, please click the preview button again to refresh it.

Known Issues:

- Issue 1: Block may break if delete some content inside and outside the block at the same time.
- Issue 2: Box can not be in the title of a block.

## Change Log

For full change log, see [CHANGELOG.md](CHANGELOG.md).

### Progress

#### Notesaw Renderer

- [x] Add support for basic Markdown syntax
- [x] Add support for KaTeX math syntax
- [ ] Add support for code blocks highlighting
- [ ] Add support for code blocks with line numbers
- [x] Basic block syntax support
- [ ] Block link support
- [x] Inline Block Syntax
- [x] Error handling
- [ ] Custom indentation length
- [ ] Custom block label

#### Notesaw Editor

- [x] VScode extension framework
- [x] Preview button to the editor
- [x] Real-time rendering
  - [x] Intelligent DOM tree replacement
  - [x] Partial rendering to improve performance
- [x] Scroll Synchronization
  - [x] Editor to preview
  - [ ] Preview to editor
- [ ] Theme support

#### Future Plans

- [ ] Theme support
- [ ] Export to PDF
- [ ] Wiki links support
- [ ] Support keypoint summary
- [ ] Syntax highlighting
- [ ] Editor formatting
- [ ] Customizeable settings

<!-- #### Settings

- [Enable]/Disable KaTeX
  - [Enable]/Disable inline KaTeX display mode
- [Enable]/Disable GFM
- [Instant]/Smooth/Disable scroll synchronization
- Bright/[Dark]/Auto theme
- [Real-time]/At save/Disable auto-rendering -->

#### Milestones

- [2025-02] Gain inspiration and start project planning.
- [2025-03] Confirm development path: build on top of [unified](https://github.com/unifiedjs/unified) framework.
- [2025-03] Start developing core features.
- [2025-04-18] Complete the first version of the core features.
- [2025-05-03] Complete main features of Notesaw VS Code preview extension.
- [2025-08-27] Redesign the style and simplify the syntax.
- [2025-09-01] Complete the first version of the Notesaw preview.

## References

- [GFM stylesheet](https://cdnjs.com/libraries/github-Markdown-css)
- [KaTeX stylesheet](https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.css)
- [Feather icons](https://feathericons.com/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
