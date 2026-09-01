# Change Log

## [Unreleased]

### Refactoring

- Extract a parameterized shared rendering core (`src/core.ts`) used by both the webview and standalone/PDF adapters, removing the duplicated unified plugin chain, SVG-sprite injection and theme application.
- Encapsulate the positional bookkeeping (`counter`/`map`/span arrays) into an `SpanState` class so each render engine carries isolated state; parallel renders / test-oracle full renders no longer clash on shared module globals.
- Split adapters into `src/note-extension.ts` (webview) and `src/note-convert.ts` (standalone); fix the misspelled adapter filename and unify return types.
- Remove stale compiled artifact `src/utils/prettyprint.js`; restrict the tsconfig `include` to `src`.

### Features

- Add a Vitest-based test suite covering the parser, transformer, render adapters, incremental engine, randomized edits and webview DOM updates (49 passing + 3 recorded known failures).
- Rebuild the incremental-rendering correctness oracle on the DOM (`.block-container` contents) instead of the unreliable span-map fingerprints; correct handling of `full` decisions when an incremental update legitimately falls back to a full render.
- Add GFM feature-coverage tests (`test/gfm.test.ts`): links, images (incl. default `imgBase`), reference links, tables with alignment, ordered/nested/task lists, blockquotes, inline & display KaTeX, fenced code with starry-night highlighting, footnotes, autolinks, headings, and GFM inside Notesaw blocks plus webview-adapter parity.
- Add long-article incremental tests (`test/long-note.test.ts`) over the provided ~2000-line note: single edits at scattered structural sites, fresh sibling blocks inserted near the top/middle/bottom, and a rapid balanced edit burst.

### Known Issues

- Harassing a document with many destructive in-place edits (setting block lines to quotes/blank, tearing braces) produces a deeply broken transitional structure; even with ghost-id guards, a late incremental update in such a state can still fail to locate its targets (recorded as `it.fails` in `incremental-press` and `incremental-continuous`). Further robust handling for deeply-broken transitional documents is still open.
- Inserting an UNCLOSED block opener (`@label Title {`, a legitimate mid-typing state) makes a partial fragment close the opened block at the fragment's end, while a full render of the same document closes it at the document's EOF — so incremental and full disagree on the block's extent (`it.fails` in `long-note`). Root-causing is still open.
- Under a burst of rapid but balanced edits on a long document, the engine can return a `partial` whose `fat` parent anchor is a ghost id absent from the DOM, so the webview falls back to a full refresh ("parent id not found") — a residual "定位失败 → full" degradation (`it.fails` in `long-note`). Root-causing is still open.

### Bug Fixes

- Fix partial-rendering span pollution: register each element's `father`/`depth`/`start`/`end` by explicit id index instead of `push`, so residual array values can no longer misassign them.
- Recognize an unnamed block whose opening brace is on the following line (e.g. `@def\n{`); previously the whole block was skipped.
- Implement multi-level closing: a shallower `}` (or EOF) now closes all deeper blocks still open, so nested blocks are no longer swallowed as raw text and long whole-block edit sequences stay DOM-consistent.
- Widen the incremental re-render interval rightward to the next sibling when an edit touches a block's closing `}` line, fixing the DOM divergence when a deleted closing brace lets a block swallow its sibling.
- Guard incremental boundaries: when the LCA resolves to a ghost id whose span has been invalidated, degrade to a full re-render instead of emitting an invalid (negative-line) partial update.
- Fix `renderFragment`/`createCorePipeline` crashing on relative images when no `imgBase` is configured: the default fell back to a bare `process.cwd()` path, which `remark-img-links` rejects with `ERR_INVALID_URL`. Now it falls back to a valid `file://` URL rooted at the current working directory.
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
