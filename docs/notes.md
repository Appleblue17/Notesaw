# 开发笔记

> 短期 temp 文档：只记录当前进度、待办与注意事项，不保留历史。历史变更见 `docs/CHANGELOG.md`。

---

## 当前进度（快照：2025-09-01 前后，版本 v0.2.2）

_Notesaw Preview_ 已发布至 v0.2.2，核心功能可用：

- 块、行内块、盒三种扩展语法已支持；缩进规则为 4 空格 / Tab。
- 基于 unified 的解析与渲染管线，实时预览 + 滚动同步（编辑器 → 预览，含 `instant` / `smooth` / `intelligent` 三种模式）。
- 部分渲染为实验性功能，可能存在边界问题。
- 代码高亮、KaTeX 数学公式、GFM 支持。
- HTML / PDF 导出（PDF 依赖 Puppeteer + _Chrome for Testing_）。

## 待办

> 完整清单见 `README.md`（Change Log → Progress / Future Plans）。此处记录与开发直接相关的短期事项。

- [ ] 核实并完善 `map*` 并行数组在部分渲染边界情况下的正确性（对应 README Known Issues Issue 1/2）。
- [ ] 检查 `note-convert.ts` 中 `setWorkspaceUri` / `workspaceUri` 导入是否冗余。
- [ ] `env.ts` 当前用 `process.cwd()` 作为初始工作区，导出场景中的相对图片路径仍需验证。
- [ ] 为解析/渲染管线补充单元测试与集成测试用例。

## 注意事项

- **设置集中在 `src/config.ts`**：`theme` / `scrollSync.*` / `pdfOptions.*` 都用类型化 helper 读取；默认值要和 `package.json` 的 `contributes.configuration`（VS Code 真正注入默认值的单一来源）保持一致。改默认值时两处同步。
- **预览实时响应设置与主题切换**：`notesaw.*` 设置变化（`onDidChangeConfiguration`）或 VS Code 颜色主题切换（`onDidChangeActiveColorTheme`）会向已打开预览发送 `setScrollSyncConfig` + `updateTheme`。webview 的 `updateTheme` 只增删 `body[data-theme]`，`follow-system` 时删属性交由 `prefers-color-scheme`。
- **部分渲染是实验特性**：预览异常时，建议提示用户重新点击预览按钮刷新（README 已说明）。
- **PDF 导出需要 Chrome**：未安装时先按 README「Get Started → Exporting」下载并在 `Puppeteer Path` 设置中配置。
- **包管理与锁文件**：`package-lock.json`（npm）与 `pnpm-lock.yaml`（pnpm）并存，`dev.sh` 走 npm、`prod.sh` 走 pnpm；改动依赖时保持两者一致。
- **CI**：super-linter 仅扫描 `src/` 与 `assets/script/webview-script.js`，提交前运行 `npm run lint`。
- **语法细节**：`+` 前缀（link 符号）、`?`/`!`/`*` 样式符号在解析器中已实现但 block-link 渲染代码在 `transformer.ts` 中被注释，仅行内块与部分场景生效，改动时留意。

## 遗留：纯部分渲染静默漂移的根因定位（vscode-edit 几何改造后剩余 it.fails）

- 现状（green：97 通过 / 3 it.fails / 0 真实失败）：engine 主动 full 与 webview `requestFullRefresh` 均=0；150 步压力序列首次纯部分 DOM 分歧发生在 step 29（`delLine` 删除某块 `}` 闭行）。
- 已验证非「引擎历史累积」：对同一 PRE 文档用**全新引擎** seed 后只做单个 `delLine`，仍分歧 → 是**单次删除**在特定文档形态下的固有失败，不是历史状态污染。
- 最小机理（PRE 文档，`@def B20 {` 的 `}` 在第 22 行被删）：全量重解析中 B20 会下吞后续 `@note B11` + 一层更深的 `a \`code\` inline…}` 内容，B20 新的真实 extent 到第 ~28 行。但引擎 map 中第 24-31 行的内容挂在**幽灵容器 id11** 下（father=1 但非任何 map 行 owner），既非 `fat=1` 的直接子兄弟，findNextSibling(10/B11) 也就扩不动 → 重渲染窗口停在 `[20..23]`，把 B20 真实要吞的子内容在 DOM 里丢掉。
- 结论：只要某区间内容挂在「非 map 行的幽灵容器」子树下，删除该处块闭行就无法用 map/注册表正确扩展右边界 —— 只能在「绝不静默出错」与「正确增量」间取其一。
- 预期修复方向（用户已认可原则，见 CHANGELOG c9d6e35 说明的反面）：部分重渲染覆盖到某旧子树根时，只把该**旧根 bookkeeping 作废/让位**给本次重解析出的新结构（不枚举整棵内部 id），使幽灵容器不再携带未来内容；或对这类结构歧义删除显式降级为**可计数的 full 兜底**，绝不静默产出错误内容。

