# Change Log

## [Unreleased]

### Features

- Adopt authoritative editor geometry end-to-end: the preview engine speaks one exact `range`+`insert` edit model (0-based positions) shared with the editor and the render core, instead of inferring whole-line replacements.
- Incremental editing is now reliable: the preview re-renders only the changed range and stays faithful to a full render even across long, sustained editing sessions; previously partial updates could drift from the true document over many edits.

### Bug Fixes

- A note that ends with an unclosed block (for example after removing a closing `}`) no longer produces a fragment the preview cannot place; the missing brace is closed with correct source line/column info so the updated block still renders with a usable id.
- Deleting a block's closing brace no longer leaves the preview inconsistent: the incremental re-render now extends through the next `}` at the matching indentation instead of mis-anchoring (or stalling).
- Block/document ranges are computed across the whole note rather than stopping at the first block, so edits to later content no longer fail to re-render the correct region.
- Stale "ghost" region anchors from earlier edits are excluded; an incremental update now resolves to a real region or cleanly re-renders the document instead of failing on a phantom id.
- Relative image paths render correctly even when no base directory is configured (previously they could crash the pipeline).
- The preview self-heals if an update cannot locate its target region, instead of getting stuck.

### Documentation

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
