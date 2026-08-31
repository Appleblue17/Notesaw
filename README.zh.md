# Notesaw 预览（Notesaw Preview）

[![Super-Linter](https://github.com/Appleblue17/Notesaw/actions/workflows/lint.yml/badge.svg)](https://github.com/marketplace/actions/super-linter)

_Notesaw_ 是 Markdown 的一种扩展标记语言，最初是为记笔记与写文档而设计的，通过增加类编程式的 block 语法等额外特性来增强表达能力。

_Notesaw Preview_ 是一个 VS Code 扩展，为 _Notesaw_ 文档提供实时预览，功能类似 VS Code 原生 Markdown 预览，但更好、更快、更强大。特性包括稳定而精准的滚动同步、由部分渲染（partial rendering）带来的低延迟体验等。

_Notesaw_ 向下兼容 Markdown，因此你也可以把它当作原生 Markdown 预览的直接替代品来使用。

block 的样式设计灵感来自 [Github Alert](https://github.com/orgs/community/discussions/16925)。

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [Notesaw 语法](#notesaw-语法)
- [它是如何工作的？](#它是如何工作的)
- [已知问题](#已知问题)
- [更新日志](#更新日志)
- [参考资源](#参考资源)
- [许可证](#许可证)

## 功能特性

**Notesaw 语法**

- 🗂️ 层级 block 语法，便于灵活组织文档结构
- ✏️ 极简语法设计，易于学习使用，简单但强大
- 🧘 极简的样式设计，实现无干扰的书写与阅读体验，与原生 GFM 样式兼容
- 🎨 图标与自动生成的标签颜色，增强视觉区分度
- 👍 原生支持 GFM 与 KaTeX
- ✈️ 扩展语法的处理复杂度为线性，与 Markdown 一样高效

**Notesaw 预览**

- ⚡ 对于大文档稳定且快速
- 🧠 智能且精准的滚动同步
- ⏳ 通过部分渲染带来的无感延迟，提升性能
- 🚀 无防抖的即时反馈

## 快速开始

1. 从 [Marketplace](https://marketplace.visualstudio.com/items?itemName=Appleblue17.notesaw-preview) 安装扩展。
2. 打开一个 Markdown 文档，或新建一个。
3. 点击编辑器右上角的预览按钮，或在命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）中搜索"Notesaw: Show Preview"。该按钮应位于原生 Markdown 预览按钮旁边。
4. 开始书写，享受实时预览！

### 导出

你可以将 _Notesaw_ 文档导出为 HTML 或 PDF 格式。方法是打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`），搜索"Notesaw: Export to HTML"或"Notesaw: Export to PDF"。导出文件将保存在 _Notesaw_ 文档所在目录。

_Notesaw Preview_ 使用 [Puppeteer](https://pptr.dev/) 生成 PDF 文件，这需要一套可用的 _Chrome for Testing_ 安装。
如果你还没有下载，我们建议手动从 [Official Releases](https://googlechromelabs.github.io/chrome-for-testing/) 下载并安装 _chrome_。找到与你操作系统及架构匹配的 `chrome` 二进制文件，从对应 URL 下载并解压到你希望的位置。你应该能在解压后的文件夹中找到 `chrome` 二进制文件，并将其绝对路径填入扩展设置中的 `Puppeteer Path`。

你也可以通过 npm 获取 _Chrome for Testing_。更多细节请参考 [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing) 与 [Puppeteer 文档](https://pptr.dev/guides/installation)。

### 扩展设置

你可以通过 VS Code 设置自定义 _Notesaw Preview_ 的行为。按下 `Ctrl + ,`（macOS 为 `Cmd + ,`）打开设置，搜索"Notesaw"以查看可用选项。

## Notesaw 语法

### 格式与缩进

_Notesaw_ 遵循相对严格的格式与缩进规则。这是为了避免歧义以及与 Markdown 语法的意外冲突，并确保一致性与可读性。以下是一些关键点：

- 使用 $4$ 个空格或一个 Tab 字符进行缩进。
- 每个 block 都应清晰缩进，以表明其层级及与其他 block 的关系。
- block 与 inline block 语法**只会根据其缩进层级被识别**。

### Block 语法

_Notesaw_ 引入了一种层级 block 语法，便于灵活组织文档。block 可以轻松嵌套与重排，让笔记结构变得简单。语法如下：

```plain
'+'? '@' label (' '+ title ' '*)? '{'
    (indented contents)
'}'

* label: [a-z]+
* title: [^\n]+ (\n' '*)?
```

- `title` 是可选的，如不需要可以省略。

- 内容必须使用 $4$ 个空格或一个 Tab 字符缩进，且只有在缩进层级正确时语法才会被识别。参见 [格式与缩进](#格式与缩进)。

- 左花括号 `{` 可以写在 block 开始符的同一行，也可以写在下一行的行首（但此时其后必须跟上换行）。

- 右花括号 `}` 必须与开始的 block 处于同一缩进层级。右花括号之后的内容会被忽略且不渲染。

#### 标签映射

_Notesaw_ 提供了一套预定义的标签及其对应的图标，用于不同类型的 block。下表中未显式定义的标签名将回退到默认图标（chevron-right）。

为方便起见，_Notesaw_ 还设置了一套 block 标签缩写。如果标签名出现在缩写表中，它将被自动替换为对应的完整标签名，颜色也会随之变化。

完整的图标与缩写列表见 [BLOCKLABEL.md](docs/BLOCKLABEL.md)。

#### 示例

```text
-> 合法

@example helloworld
{
    Greetings!
}
```

````text
-> 合法

@def Markdown {
    Markdown 是一种使用纯文本编辑器创建格式化文本的轻量级标记语言。

    @example {
      ```md
      > Hello, *Markdown*!
      ```
    }
}
````

```text
-> 非法（缩进不正确，嵌套定义不会被识别）

@example nested {
  @def nested {
   This is a nested definition.
  }
}
```

```text
-> 非法（花括号后有冗余字符）

@example greetings
{ abc
    helloworld
} def
```

#### 推荐用法

block 是组织相关内容并呈现清晰结构的好选择，但如果包含大量文本则可能显得臃肿。建议使用 block 来**突出核心概念**，再在 block 外对它们做详细说明。

你还可以将相关的内容包裹进 block 中，例如定理、证明、示例等，以提升可读性与组织性。

### Inline Block 语法

inline block 是 block 的"行内"版本，让你在不中断文字书写节奏的前提下为文本添加格式与结构。语法如下：

```plain
'+'? '@' label [?!*]? ' ' content '\n'

* label: [a-z]+
* content: [^\n]*
```

- inline block 必须是单行，不能包含换行。

- 只有在缩进层级正确时语法才会被识别。参见 [格式与缩进](#格式与缩进)。

- 目前 inline block 不支持标题。

#### 示例

```text
-> 合法

@note **Be careful** with the indentation.
```

#### 推荐用法

inline block 很适合为文本的特定部分添加强调或补充上下文，而不会破坏书写的整体流程。它是一种很好的实践，把 inline block 用作"补充说明"——一种强调重要提示、贴士或注释的方式。

简短的定义或解释也可以用 inline block 来有效传达，更像是一种轻量级的 block。

### Box 语法

box 是一个轻量、灵活的行内容器，可用于突出或强调重要信息或关键词。语法如下：

```plain
'@[' [^@]* ']'
```

- 内容可以包含文本、行内代码甚至数学表达式，但不支持多行内容或图片。

- box 语法**不能在另一个 box 语法中嵌套**，但可以用于其他语法上下文中。

#### 示例

```text
-> 合法

@[Markdown]: Markdown 是一种使用纯文本编辑器创建格式化文本的轻量级标记语言。

@[$a^2+b^2=c^2$] 是数学中一个著名的等式。
```

```text
-> 合法

@[Markdown]

Markdown 是一种使用纯文本编辑器创建格式化文本的轻量级标记语言。
```

#### 推荐用法

box 语法适合在较大的上下文中突出重要信息或关键词。它有很广泛的潜在用途，包括：

- 强调关键术语或概念
- 用于定义或解释的声明
- 在不打断书写流程的前提下作为迷你标题来分隔内容

上面的示例演示了有效使用 box 语法的一部分场景。

## 它是如何工作的？

_Notesaw_ 构建在 [unified](https://github.com/unifiedjs/unified) 框架/生态之上，它为处理和转换 Markdown 内容提供了强大而灵活的方式。

**解析。** _Notesaw_ 解析器（`src/parser.ts`）会线性扫描整个文档，边扫描边识别并处理扩展语法元素（block、inline block、box），这使得它非常高效。文档的其余部分会被切分成若干片段，每个片段由 [remark](https://github.com/remarkjs) 处理得到对应的 MDAST 片段。_Notesaw_ 再将所有片段合并为最终的 MDAST，最后由 [rehype](https://github.com/rehypejs/rehype) 处理成 HAST 并最终生成 HTML。缩进（4 个空格或一个 Tab）决定了层级，因此扩展语法只会在正确的缩进层级被识别。

**位置跟踪。** 在变换阶段（`src/transformer.ts`），每个渲染出来的元素都会被分配一个稳定的 `id`，_Notesaw_ 会维护一组"行号到 block"的映射（`map`、`mapStartLine`、`mapEndLine`、`mapDepth`、`mapFather`），记录编辑器每一行属于哪个 block。结合 [remark](https://github.com/remarkjs) 提供的 position 信息，这些映射是编辑器与预览之间滚动同步以及部分渲染的关键。

**渲染。** 生成的 HTML 片段会交付给 webview（`assets/script/webview-script.js`），后者通过 [morphdom](https://github.com/patrick-steele-idem/morphdom) 执行一次完整的 diff 更新；或者在发生文本编辑时，只重新处理最小受影响的范围，并对对应的 DOM 子树进行原地修补。HTML/PDF 导出复用了同一套核心管线（`src/note-convert.ts`），其中 PDF 生成由 [Puppeteer](https://pptr.dev/) 处理。

更多细节参见 [architecture.md](docs/architecture.md)。

## 已知问题

🧪 **部分渲染**目前是实验性功能，可能工作不正常。如果预览异常，请再次点击预览按钮刷新它。

已知问题：

- 问题 1：如果同时在 block 内与 block 外删除一些内容，block 可能会被破坏。
- 问题 2：box 不能出现在 block 的标题中。

## 更新日志

完整的更新日志见 [CHANGELOG.md](docs/CHANGELOG.md)。

### 进度

#### Notesaw 渲染器

- [x] 支持基础 Markdown 语法
- [x] 支持 KaTeX 数学公式语法
- [ ] 支持代码块高亮
- [ ] 支持带行号的代码块
- [x] 基础 block 语法支持
- [ ] block 链接支持
- [x] inline block 语法
- [x] 错误处理
- [ ] 自定义缩进长度
- [ ] 自定义 block 标签
- [x] 导出为 PDF

#### Notesaw 编辑器

- [x] VS Code 扩展框架
- [x] 编辑器中的预览按钮
- [x] 实时渲染
  - [x] 智能 DOM 树替换
  - [x] 部分渲染以提升性能
- [x] 滚动同步
  - [x] 编辑器 → 预览
  - [ ] 预览 → 编辑器
- [x] 主题支持

#### 未来计划

- [ ] Wiki 链接支持
- [ ] 支持要点摘要
- [ ] 语法高亮
- [ ] 编辑器格式化
- [ ] 可自定义的设置

<!-- #### 设置

- [启用]/禁用 KaTeX
  - [启用]/禁用行内 KaTeX 显示模式
- [启用]/禁用 GFM
- [即时]/平滑/禁用滚动同步 -->

#### 里程碑

- [2025-02] 获得灵感，开始项目规划。
- [2025-03] 确认开发路径：基于 [unified](https://github.com/unifiedjs/unified) 框架构建。
- [2025-03] 开始开发核心功能。
- [2025-04-18] 完成核心功能第一版。
- [2025-05-03] 完成 Notesaw VS Code 预览扩展的主要功能。
- [2025-08-27] 重新设计样式并简化语法。
- [2025-09-01] 完成 Notesaw 预览第一版。

## 参考资源

- [GFM 样式表](https://cdnjs.com/libraries/github-Markdown-css)
- [KaTeX 样式表](https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.css)
- [Feather 图标](https://feathericons.com/)

## 许可证

本项目使用 MIT 许可证发布——详情见 [LICENSE](LICENSE) 文件。
