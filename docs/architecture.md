# Notesaw 技术架构

> 本文档记录 _Notesaw_ 项目的技术架构、核心设计决策与数据流。它是 `agent-workflow.md` 中"决策有记录"原则的落点：重要技术决策及其理由都会记录在这里，便于后续查阅。

---

## 1. 项目概览

Notesaw 是一个 VS Code 扩展（`notesaw-preview`），为 _Notesaw_ 文档提供实时预览能力。

- **Notesaw**：一种在 Markdown 基础上扩展的标记语言，目标是记笔记与文档写作。向下兼容 Markdown，可作为原生 Markdown 预览的直接替代。
- **Notesaw Preview**：VS Code 扩展，提供实时预览，具备精准滚动同步、部分渲染、导出 HTML/PDF 等功能。

技术栈：TypeScript + [unified](https://github.com/unifiedjs/unified) 生态（remark / rehype）+ Puppeteer（仅用于 PDF 导出）。

---

## 2. 核心设计决策（ADR）

### 2.1 基于 unified 生态构建解析与渲染管线

- **决策**：解析和渲染全部基于 `unified` 框架，使用 remark 获取 MDAST、rehype 生成 HAST 与 HTML。
- **理由**：unified 生态成熟、插件体系完善、对 position 信息的支持好，方便实现滚动同步与部分渲染所需的行号映射；同时可复用 GFM、KaTeX、代码高亮等现成插件，大幅降低维护成本。

### 2.2 线性扫描 + 按片段解析的混合解析策略

- **决策**：自定义解析器 `parseNote` 对全文做一次线性扫描，仅识别扩展语法（块、行内块、盒）；识别出的普通 Markdown 片段再交给 remark 分段解析成 MDAST，最后合并为整棵 MDAST。
- **理由**：满足"扩展语法处理线性复杂度、与 Markdown 同效率"的性能目标（见 README 特性）。整棵 MDAST 保留每个节点的 position 信息，支撑滚动同步与部分渲染。
- **关键点**：缩进是块/行内块识别的依据（4 个空格或一个 Tab）。严格缩进规则是为了避免与 Markdown 原生语法冲突、保证一致性与可读性。

### 2.3 为每个元素分配稳定 ID，维护"行号 → 块 ID"映射

- **决策**：在 rehype 变换阶段（`transformer.ts` 的 `transformNote`）为每个有效元素（元素节点）分配全局递增的 `id`，并维护一组并行数组：`map`（行号 → 所在块 ID）、`mapStartLine` / `mapEndLine`（块的起始/结束行）、`mapDepth`（深度）、`mapFather`（父节点 ID）。
- **理由**：这些映射是滚动同步（编辑器光标/可视区 → 预览位置）与部分渲染（精确定位 DOM 中需要替换的子树）的基础。用并行数组而非对象，是为了在按行号高频更新时更高效。

### 2.4 部分渲染（Partial Rendering）与消息队列节流

- **决策**：编辑器文本变化时，先计算最小受影响的行区间（基于块 LCA / 块边界），仅重新处理该片段并做 DOM 局部替换；同时用消息队列对频繁的文本变化事件做串行化节流。
- **理由**：大文档下避免每次按键都全量渲染，保证性能与即时反馈。
- **注意**：当前部分渲染仍为**实验性功能**（见 README「Known Issues」），DOM 替换依赖 `morphdom` 与 webview 端脚本维护的 ID 索引，边界情况可能出错，已知问题已记录。

### 2.5 导出 PDF 使用 Puppeteer + Chrome for Testing

- **决策**：HTML→PDF 使用 [Puppeteer](https://pptr.dev/) 驱动无头浏览器渲染。
- **理由**：能复用 webview 同一套 CSS 样式的渲染结果，保证导出与预览外观一致。
- **注意**：需要可用的 Chrome 可执行文件，可在扩展设置中通过 `Puppeteer Path` 指定，或使用包内置的 Chrome。

---

## 3. 模块划分与文件职责

### 3.1 扩展宿主层（VS Code）

| 文件 | 职责 |
|------|------|
| `src/extension.ts` | 扩展入口。创建/复用 webview 面板；监听文本变化、活动编辑器切换、光标与可视区变化并驱动预览同步；实现 `showPreview`、`export_to_html`、`export_to_pdf` 三个命令；维护 `mapLast`/`mapNext` 边界映射与消息队列。 |
| `src/env.ts` | 全局工作区 URI（`workspaceUri`）状态，用于解析相对图片路径。 |

### 3.2 渲染管线层（unified 插件）

| 文件 | 职责 |
|------|------|
| `src/index.ts` | 共享类型：`NoteNode`（MDAST/HAST 节点），定义了 `position`、`data.hName` 等扩展字段。 |
| `src/parser.ts` | `noteParsePlugin`（注册自定义解析器 `parseNote`）、`noteBoxParsePlugin`（处理盒语法与数学公式包装）。含块、行内块、盒语法的解析逻辑，以及与行号相关的 `lines`/`columns`/`trimNums` 等数组。 |
| `src/transformer.ts` | `noteTransformPlugin`（rehype 变换）：识别 `*-block-mdast` / `*-inline-block-mdast` / `box` 类名并转换为带样式的 HTML；分配元素 ID 并维护 `map*` 并行数组；生成 HSL 标签颜色与 Feather 图标。 |
| `src/note-extention.ts` | webview 渲染入口：`noteProcessInit`（初始化空外壳 HTML）与 `noteProcess`（对文档/片段做完整 unified 管线处理）。 |
| `src/note-convert.ts` | 独立 HTML 导出入口：`noteProcessConvert`（生成含完整 `rehype-document` 外壳、可独立打开的 HTML）。 |

### 3.3 前端资源层（webview）

| 文件 | 职责 |
|------|------|
| `assets/script/webview-script.js` | 接收扩展端消息并执行：全量替换（`updateHtml`，用 morphdom）、部分替换（`partialUpdateHtml`）、滚动同步（`syncPreview`）、滚动配置（`setScrollSyncConfig`）。 |
| `assets/script/morphdom-umd.min.js` | 第三方 DOM 差异更新库（morphdom）。 |
| `assets/styles/note.css` | Notesaw 块、行内块、盒等自定义样式。 |
| `assets/styles/github-markdown.css` | GFM 基础样式。 |
| `assets/styles/katex.min.css` | KaTeX 数学公式样式。 |
| `assets/icon/feather-sprite.svg` | Feather 图标 SVG sprite，供块标签图标 `<use>` 引用。 |

---

## 4. 数据处理流程

### 4.1 预览渲染（webview）

```
扩展端 noteProcess
  → noteParsePlugin（自定义 parseNote：线性扫描 + 分段 remark 解析 → MDAST）
  → noteBoxParsePlugin（盒语法 & 数学公式包装）
  → remarkImgLinks（相对图片路径 → 绝对）
  → remarkRehype（MDAST → HAST）
  → rehypeKatex（数学公式渲染）
  → noteTransformPlugin（块样式/图标/ID 分配 + map* 维护）
  → rehypeStarryNight（代码高亮）
  → rehypeStringify（HAST → HTML 片段）
  → postMessage("updateHtml" / "partialUpdateHtml")
```

webview 端 `webview-script.js` 依据消息对 `.markdown-body` 做全量（morphdom）或部分（按 `id` 定位 `fat` 父节点、替换 `x`~`y` 子区间）DOM 更新。

### 4.2 滚动同步

- 扩展端维护 `map`（行号 → 块）及 `mapLast`/`mapNext`（行号 → 前后块边界），监听光标列与可视区变化，构造 `syncPreview` 消息。
- webview 端 `syncPreview` 根据光标在可视区内的相对位置 `percent`，结合块元素几何信息计算出预览应滚动到的 `scrollPosition`，并按配置的模式（`instant` / `smooth` / `intelligent`）与跨页阈值决定滚动行为。

### 4.3 HTML / PDF 导出

- HTML：`noteProcessConvert` 复用渲染管线，并额外套 `rehype-document` + `rehype-format`，生成可独立打开的 HTML。
- PDF：先生成临时 HTML，再用 Puppeteer 加载并调用 `page.pdf()`，最后删除临时 HTML。相关参数（格式、边距、缩放、页眉页脚等）来自 `notesaw.pdfOptions.*` 配置。

---

## 5. 相关文档索引

- `README.md`：用户向的使用说明与 Markdown 扩展语法文档。
- `docs/BLOCKLABEL.md`：块标签 → 图标映射与缩写映射表。
- `docs/CHANGELOG.md`：所有重要变更日志。
- `docs/notes.md`：高时效的开发笔记（进度、待办、注意事项）。
- `docs/agent-workflow.md`：Agent 工作流规范。
- 本文件：技术架构设计与决策记录。
