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
- Make every full-render fallback observable (directive-1): the render engine now counts engine-proactive `{kind:"full"}` decisions (`fullFallbackCount`) with per-step reasons (`fullFallbackReasons`), and the test helper `applyDecisionAndStats` reports BOTH engine-proactive and webview `requestFullRefresh` fallbacks per step so no whole-document re-render is silently swallowed by a test.
- Add vscode-faithful positional-edit coverage (`test/incremental-vscode-edit.test.ts`): the engine is validated against real vscode edits it previously never saw — mid-line empty-range inserts, single-line range replaces (`range.end > range.start`), and multi-line inserts at a boundary — each checked for DOM equality with a clean full render.

### Known Issues

- None open at time of writing: the pure-partial DOM divergence previously recorded here (first seen ~step 29 of a 150-step press run) is resolved — DOM block contents stay equal to a clean full render across the whole run and the engine/webview never degrade to a full fallback. The corresponding `incremental-press`, `incremental-continuous` and `incremental-fullfallback` suites now run as plain (non-`it.fails`) passing tests.

### Bug Fixes

- Fix unclosed-block source positions at end of input (`closeTopBlock` EOF path): a container whose closing `}` is absent (or is cut mid-line) ended the fragment at `index + 1`, past the end of the position tables, so its `.position.end` became `{line: undefined, …}`. rehype then dropped the node’s addressability and the incremental fragment was emitted without the block `id`, leaving `partialUpdateHtml` unable to resolve its `x`/`y`/`fat` anchors. The end is now clamped to the last valid offset so the re-rendered HTML carries the container id.
- Fix the document root span record in `transformNote`: the root element’s `position` was collapsed to its **first** child (`tree.children[0]`), so `.markdown-body` and top-level aggregates reported an end that stopped at the first block even when more blocks followed. It now spans from the first child’s start to the **last** child’s end.
- Rewrite the incremental right-edge extension as a **source-text walk** instead of the ghost sibling scan: when an edit reaches/removes the closer of the far container, widen the re-render down to the next `}` at that container’s opener column (bounded by its father) and re-anchor the splice target `y` onto that bottom row. Fixes swallowing after a deleted closing `}` and the prior sub-scan that could offer stale ghost ids.
- Remove the `it.fails` guards from the 150-step press, per-step continuous, and ZERO-full-fallback suites (DOM block contents now stay equal to a clean full render across the whole run, with engine and webview full fallbacks both ZERO), and give the 150-step press test an explicit timeout so it no longer trips the default in a full suite run.
- Adopt authoritative VSCode `Edit` geometry end-to-end. Add `TextModel`/`Edit`/`Range`/`Pos` (`src/vscode-edit.ts`) as the single geometry authority; the test `MockEditor`, the incremental render engine and the extension's `handleTextChange` all consume a real `range`+`text` edit (0-based Positions) instead of collapsed whole-line `LineChange`s. The engine now reads the net line delta from the authoritative document line count instead of guessing a whole-line replacement delta.
- The editor mock no longer fabricates inverted/empty-credit ranges: whole-line test ops (`setLine`/`delete`/`insertBefore`) each derive an exact vscode `Edit` over the model's text, eliminating mock-vs-engine drift.
- Fix (long-note Finding A) incremental fragment swallowing less than a clean full render when inserting an unclosed block opener mid-document: now matches a full render on the block's extent.
- Fix (long-note Finding B) "定位失败 → full" ghost-anchor degradation: under rapid balanced edits the engine's `fat`/`x`/`y` anchors no longer reference ghost ids absent from the DOM, so the webview no longer requests a full refresh. Both long-note guards are now passing invariants.

- Fix partial-rendering span pollution: register each element's `father`/`depth`/`start`/`end` by explicit id index instead of `push`, so residual array values can no longer misassign them.
- Recognize an unnamed block whose opening brace is on the following line (e.g. `@def\n{`); previously the whole block was skipped.
- Implement multi-level closing: a shallower `}` (or EOF) now closes all deeper blocks still open, so nested blocks are no longer swallowed as raw text and long whole-block edit sequences stay DOM-consistent.
- Widen the incremental re-render interval rightward to the next sibling when an edit touches a block's closing `}` line, fixing the DOM divergence when a deleted closing brace lets a block swallow its sibling.
- Guard incremental boundaries: when the LCA resolves to a ghost id whose span has been invalidated, degrade to a full re-render instead of emitting an invalid (negative-line) partial update.
- Drop the whole-document "live/ghost" cleanup pass and its span-invalidating guards on the incremental path. The pass re-marked ids `-1` on the sole basis of whether they were a row in `map`, which wrongly killed parent/container nodes that are legitimately never row-owners yet are still referenced by live children — the underlying cause of the repeated degraded-to-full drift. With it gone, stale old blocks are instead excluded where they actually break things.
- Fix `findNextSibling` in the right-edge range extension: it offered any same-father id whose span starts after the current block's *start*, so a stale duplicate from an earlier re-render that still overlaps the block's own span could be picked as the far edge `y`, yielding an inverted `x`/`y` anchor. It now only considers blocks still referenced by `map` and whose span begins after the current block's *end*. This makes the first DOM divergence of the press sequence move from step 5 to step 12.
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
