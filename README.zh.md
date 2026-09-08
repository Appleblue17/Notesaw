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

请参阅 [SYNTAX.md](docs/SYNTAX.md) 了解 _Notesaw_ 的完整语法规范。

**建议在使用 _Notesaw_ 之前阅读语法规范，这将帮助你理解设计理念以及如何有效地书写和组织笔记。**

> **关于 GFM 脚注的一点说明。** 脚注引用（`text[^1]`）与其定义（`[^1]: …`）是由 Markdown 在整个文档范围内一起解析的。由于 _Notesaw_ 预览采用增量渲染——只重新渲染发生改动的区间而不是整篇笔记——引用与定义只有在落在同一次被重渲染的区间内时才能稳定地建立关联。因此现阶段建议让两者紧邻（或处于相邻内容中）；相隔较远的脚注在不同区间被编辑时可能丢失其链接。跨区间的脚注追踪完整支持计划在未来的重写中提供。

## 实现细节

_Notesaw_ 构建在 [unified](https://github.com/unifiedjs/unified) 框架/生态之上，它为处理和转换 Markdown 内容提供了强大而灵活的方式。

**解析。** _Notesaw_ 解析器（`src/parser.ts`）会线性扫描整个文档，边扫描边识别并处理扩展语法元素（block、inline block、box），这使得它非常高效。文档的其余部分会被切分成若干片段，每个片段由 [remark](https://github.com/remarkjs) 处理得到对应的 MDAST 片段。_Notesaw_ 再将所有片段合并为最终的 MDAST，最后由 [rehype](https://github.com/rehypejs/rehype) 处理成 HAST 并最终生成 HTML。缩进（4 个空格或一个 Tab）决定了层级，因此扩展语法只会在正确的缩进层级被识别。

**位置跟踪。** 在变换阶段（`src/transformer.ts`），每个渲染出来的元素都会被分配一个稳定的 `id`，_Notesaw_ 会维护一组"行号到 block"的映射（`map`、`mapStartLine`、`mapEndLine`、`mapDepth`、`mapFather`），记录编辑器每一行属于哪个 block。结合 [remark](https://github.com/remarkjs) 提供的 position 信息，这些映射是编辑器与预览之间滚动同步以及部分渲染的关键。

**渲染。** 生成的 HTML 片段会交付给 webview（`assets/script/webview-script.js`），后者通过 [morphdom](https://github.com/patrick-steele-idem/morphdom) 执行一次完整的 diff 更新；或者在发生文本编辑时，只重新处理最小受影响的范围，并对对应的 DOM 子树进行原地修补。HTML/PDF 导出复用了同一套核心管线（`src/note-convert.ts`），其中 PDF 生成由 [Puppeteer](https://pptr.dev/) 处理。

更多细节参见 [architecture.md](docs/architecture.md)。

## 更新日志

完整的更新日志见 [CHANGELOG.md](docs/CHANGELOG.md)。

### 进度

#### Notesaw 渲染器

- [x] 支持基础 Markdown 语法
- [x] 支持 KaTeX 数学公式语法
- [x] 支持代码块高亮
- [x] 支持带行号的代码块
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

#### 里程碑

- [2025-02] 获得灵感，开始项目规划。
- [2025-03] 确认开发路径：基于 [unified](https://github.com/unifiedjs/unified) 框架构建。
- [2025-03] 开始开发核心功能。
- [2025-04-18] 完成核心功能第一版。
- [2025-05-03] 完成 Notesaw VS Code 预览扩展的主要功能。
- [2025-08-27] 重新设计样式并简化语法。
- [2025-09-01] 完成 Notesaw 预览第一版并发布到 VS Code Marketplace。
- [2025-10-26] 发布 v0.2.0。
- [2026-02-17] 发布 v0.2.2。

## 参考资源

- [GFM 样式表](https://cdnjs.com/libraries/github-Markdown-css)
- [KaTeX 样式表](https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.css)
- [Feather 图标](https://feathericons.com/)

## 许可证

本项目使用 MIT 许可证发布——详情见 [LICENSE](LICENSE) 文件。
