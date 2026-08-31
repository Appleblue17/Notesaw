# Agent 工作流规范

> 本文档定义 AI Agent 在开发本项目时应遵循的工作流程、代码规范、环境配置、文档更新和汇报要求。

---

## 1. 核心原则

1. **保持文档新鲜**：修改代码前或造成更改后，及时更新相关文档
2. **代码可维护**：遵循代码规范，确保代码清晰、易读、易维护
3. **变更可追溯**：所有重要变更记录在 `docs/CHANGELOG.md`
4. **及时沟通**：遇到问题时，及时与用户沟通并寻求帮助
5. **持续集成**：确保代码质量，通过自动化测试和检查
6. **决策有记录**：重要技术决策及其理由记录在 `docs/architecture.md`，便于后续查阅

---

## 2. 环境与构建

### 2.1 环境要求

- Node.js 与 npm / pnpm
- 包管理锁文件：`package-lock.json`（npm）与 `pnpm-lock.yaml`（pnpm）同时存在；两者分别对应 `scripts/dev.sh` 与 `scripts/prod.sh`，改动依赖时需保持二者一致。

### 2.2 构建与脚本

| 命令 | 作用 |
|------|------|
| `npm run compile`（`tsc -p ./`） | 编译 TypeScript 至 `out/` |
| `npm run lint`（`eslint src`） | 对 `src` 进行 ESLint 检查 |
| `npm run pretest` | `compile` + `lint`，供 `test` 前置执行 |
| `npm run test`（`vscode-test`） | 运行 VS Code 集成测试 |
| `npm run watch`（`tsc -watch`） | 增量编译监听模式 |
| `scripts/dev.sh` | 开发环境重建：清空 `node_modules` 与锁文件后 `npm install` |
| `scripts/prod.sh` | 打包流程：跳过 Puppeteer 下载 → `pnpm install` → `compile` → 安装仅生产依赖 → `vsce package` |

### 2.3 CI

`.github/workflows/lint.yml` 使用 super-linter 对 `src/` 与 `assets/script/webview-script.js` 进行 lint 校验（`FILTER_REGEX_INCLUDE` 限定范围，`VALIDATE_JSCPD: false`）。Agent 应在提交前自行 `npm run lint` 保证代码符合 CI 标准。

---

## 3. 文档体系

| 文档 | 职责 |
|------|------|
| `README.md` | 项目简介、快速开始、文档索引（写给用户） |
| `docs/CHANGELOG.md` | 所有重要变更日志（Keep a Changelog 格式） |
| `docs/notes.md` | 开发笔记：进度、待办、注意事项（高时效，频繁更新） |
| `docs/agent-workflow.md` | Agent 工作流规范（本文档） |
| `docs/architecture.md` | 技术架构设计与决策记录 |
| `docs/BLOCKLABEL.md` | Block 标签与缩写列表 |

---

## 4. 开发流程

### 4.1 标准工作流

1. 阅读相关文档和项目代码，理解任务需求和设计。如有不清晰或待决策的地方，及时向用户提出与讨论。
2. 将新添加或修改的功能记录更新至文档中，以便后续查阅。
3. 拟订开发计划，明确任务的开发顺序和依赖关系。
4. 按照开发计划，逐步实现功能模块，并在每个阶段完成后进行测试和汇报。
5. 同步编写单元测试和集成测试，确保代码质量和功能正确性。
6. 功能实现后，让用户进行验收和测试，确保功能符合预期。
7. 在用户验收通过后，将实际开发时进行的变更记录至文档。
8. 按用户指令进行 commit 或 branch merge，并更新 `docs/CHANGELOG.md`。

### 4.2 代码规范

- 语言：TypeScript，严格遵循 `tsconfig.json` 与 ESLint（`eslint.config.mjs`）配置。
- 风格：遵循 `.prettierrc` 配置；保持代码清晰、易读、易维护。
- 命名：类型/类使用 PascalCase，函数/变量使用 camelCase，常量使用 SCREAMING_SNAKE_CASE（参考现有代码风格）。
- 模块边界：新增渲染管线能力时，优先在 `src/` 对应模块（parser / transformer / note-extention / note-convert）内扩展；webview 端逻辑放 `assets/script/webview-script.js`。
- 提交前执行 `npm run lint`（Agents 能力有限的场景下至少保证不新增 lint 错误）。

### 4.3 测试

- 单元/集成测试位于 VS Code 测试框架（`vscode-test`）下，由 `test` 脚本调用。
- 涉及解析/渲染管线的改动，应补充相应测试用例（`@vscode/test-cli` 提供运行入口）。

### 4.4 Git 提交规范

```
[<type>](<optional-scope>): <subject>
```

**type**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `test`: 测试相关
- `refactor`: 重构
- `perf`: 性能优化
- `build`: 构建系统或外部依赖变更
- `ci`: CI 配置与脚本变更
- `chore`: 杂项（工具配置、清理等）

注意事项：
- 语言统一使用英文
- 一句话描述变更内容，不要附带详细说明

**示例**：`[update] Add new block types and corresponding icons in BLOCKLABEL and update abbreviation mapping`

> 提交由 AI Agent 生成时，需附带 `Generated with Continue` 的 co-author 信息。
