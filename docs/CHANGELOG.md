# Change Log

## [Unreleased]

### Features

- Adopt authoritative editor geometry end-to-end: the preview engine speaks one exact `range`+`insert` edit model (0-based positions) shared with the editor and the render core, instead of inferring whole-line replacements.
- Incremental editing is now reliable: the preview re-renders only the changed range and stays faithful to a full render even across long, sustained editing sessions; previously partial updates could drift from the true document over many edits.
- Notesaw settings (theme and scroll-sync mode/thresholds) now apply to an open preview immediately, and the preview tracks VS Code color-theme switches, without needing to reopen the preview. Configuration reads are centralized in `src/config.ts` (typed helpers whose defaults mirror the `package.json` schema) instead of being re-read with ad-hoc defaults at each call site.
- Fenced code blocks get a **language label** and a **Copy** button, plus **per-line numbers** in the preview and exports. The line numbers are toggleable with the new `notesaw.codeBlock.lineNumbers` setting (default on); copying always takes the un-numbered source text. Addressed in the shared core (via a new opt-in render option) so preview and HTML/PDF export stay in parity without disturbing the existing syntax highlighting or the incremental renderers.

### Bug Fixes

- A note that ends with an unclosed block (for example after removing a closing `}`) no longer produces a fragment the preview cannot place; the missing brace is closed with correct source line/column info so the updated block still renders with a usable id.
- Deleting a block's closing brace no longer leaves the preview inconsistent: the incremental re-render now extends through the next `}` at the matching indentation instead of mis-anchoring (or stalling).
- Block/document ranges are computed across the whole note rather than stopping at the first block, so edits to later content no longer fail to re-render the correct region.
- Stale "ghost" region anchors from earlier edits are excluded; an incremental update now resolves to a real region or cleanly re-renders the document instead of failing on a phantom id.
- Relative image paths render correctly even when no base directory is configured (previously they could crash the pipeline).
- The preview self-heals if an update cannot locate its target region, instead of getting stuck.
- Small dotted accents inside icons (for example the dot under `help-circle`'s question mark) no longer vanish: block icons are drawn with round stroke caps, so Feather's zero-length "dot" segments render as a visible dot.
- Block icon, label, and left-border accent colors are no longer baked in at a fixed washed-out lightness. The accent hue is stored per block and its lightness is chosen per theme, so **light mode** uses a darker accent for adequate contrast on white, while **dark mode** keeps the vivid original look.
- Boxes that stand alone on their own lines (for example two `@[…]` lines separated by a blank line) no longer render side by side on the same row: each standalone box is wrapped in its own paragraph block, so they stack vertically like normal block content.
- A box is no longer clipped into a broken self‑closing `<box …/>` when its body contains another `@[…]`: boxes are an inline, non‑nested construct, so the outer box is kept and any nested `@[` is treated as literal text inside the outer box's highlight. This also fixes a lone box used as an entire title/line disappearing. Inline boxes inside running prose are unchanged.

### Documentation

- Move `CHANGELOG.md` and `BLOCKLABEL.md` into the `docs/` directory.
- Move `SYNTAX.md` into the `docs/` directory and link it from the README.

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
