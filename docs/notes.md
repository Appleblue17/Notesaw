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

- **部分渲染是实验特性**：预览异常时，建议提示用户重新点击预览按钮刷新（README 已说明）。
- **PDF 导出需要 Chrome**：未安装时先按 README「Get Started → Exporting」下载并在 `Puppeteer Path` 设置中配置。
- **包管理与锁文件**：`package-lock.json`（npm）与 `pnpm-lock.yaml`（pnpm）并存，`dev.sh` 走 npm、`prod.sh` 走 pnpm；改动依赖时保持两者一致。
- **CI**：super-linter 仅扫描 `src/` 与 `assets/script/webview-script.js`，提交前运行 `npm run lint`。
- **语法细节**：`+` 前缀（link 符号）、`?`/`!`/`*` 样式符号在解析器中已实现但 block-link 渲染代码在 `transformer.ts` 中被注释，仅行内块与部分场景生效，改动时留意。
