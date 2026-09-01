# Change Log

## [Unreleased]

### Refactoring

- Extract a parameterized shared rendering core (`src/core.ts`) used by both the webview and standalone/PDF adapters, removing the duplicated unified plugin chain, SVG-sprite injection and theme application.
- Split adapters into `src/note-extension.ts` (webview) and `src/note-convert.ts` (standalone); fix the misspelled adapter filename and unify return types.
- Remove stale compiled artifact `src/utils/prettyprint.js`; restrict the tsconfig `include` to `src`.

### Features

- Add a Vitest-based test suite (44 tests) covering the parser, transformer, render adapters, incremental engine, randomized edits and webview DOM updates.

### Bug Fixes

- Fix partial-rendering span pollution: register each element's `father`/`depth`/`start`/`end` by explicit id index instead of `push`, so residual array values can no longer misassign them.
- Fix `extendMapArray` dead loop and make array extension explicit.
- Self-heal the preview when an incremental DOM update cannot locate its targets: the webview requests a full refresh (throttled) instead of silently stalling.

### Documentation

- Add `docs/architecture.md` (architecture & decisions) and complete `docs/agent-workflow.md` (environment/build/code standards) and `docs/notes.md`.
- Rewrite the README "How does it work?" section, fix documentation links, and add a Chinese translation (`README.zh.md`).
- Move `CHANGELOG.md` and `BLOCKLABEL.md` into the `docs/` directory.

## [0.2.2] - 2026-02-17

### Features

- Added configuration options for scroll synchronization between editor and preview.
- Improved update handling for synchronized scrolling.

### Bug Fixes

- Fixed webview losing context when hidden.
- Cleaned up internal states when switching files.
- Improved text change handling by introducing a message queue for better performance.
- Resolved various issues with `mapLine` updates.
- Fixed comment parsing errors.
- Ensured proper cleanup when showing preview (e.g., after clicking the startup button).

### Enhancements

- Added TypeScript type annotations for event handlers in `extension.ts` to improve type safety.
- Introduced new block types and corresponding icons in `BLOCKLABEL`.
- Updated abbreviation mapping for new block types.

## [0.2.1] - 2025-10-25

### Enhancements

- Add `scale` configuration for PDF exporting.
- Enhance guidance for downloading _Chrome for Testing_ to enable Puppeteer's PDF exporting functionality.
- Optimize Extension package size.

## [0.2.0] - 2025-10-23

### Features

- Add export to html and PDF functionality.
- Add syntax highlighting support for code blocks.
- Add VSCode configurations for customizing preview appearance and export settings.
- Add theme configurations: light, dark, follow system and follow vscode.

### Bug Fixes

- Fix partial rendering issues with code blocks.
- Fix theme support for light mode.

### Enhancements

- Add new block types: `remember`, `summary`, and `method`.

## [0.1.0] - 2025-09-01

- Initial release

### Features

- Basic Notesaw syntax support (block, inline block, box)
- Real-time rendering
- Editor-to-preview scroll synchronization
- Partial rendering for improved performance
