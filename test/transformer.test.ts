import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderFragment } from "../src/core.ts";
import { SpanState } from "../src/transformer.ts";

const noteCssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "styles", "note.css");
const noteCss = fs.readFileSync(noteCssPath, "utf8");

let state: SpanState;

beforeEach(() => {
  state = new SpanState();
});

describe("transformer: id and Map bookkeeping", () => {
  it("assigns sequential ids and records map entries for elements", async () => {
    const doc = "@example hello\n{\n    world\n}";
    await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true, spanState: state });

    const s = state.snapshot();
    // every element got an id > 0
    expect(s.counter).toBeGreaterThan(0);
    // mapStartLine/mapEndLine arrays indexed by id are populated
    expect(s.mapStartLine.length).toBe(s.counter + 1);
    expect(s.mapEndLine.length).toBe(s.counter + 1);
    // mapDepth/mapFather chains point at the root (id 0) for top-level elements
    expect(s.mapFather[1]).toBe(0);
  });

  it("maps document lines to the block that contains them", async () => {
    const doc = "intro line\n\n@example hello\n{\n    inside\n}\n\ntrailer";
    await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true, spanState: state });

    const s = state.snapshot();
    // find the id of the example block by scanning its start line
    const exampleBlockId = Object.keys(s.mapStartLine).find(
      (k) => s.mapStartLine[Number(k)] === 3, // block starts on line 3
    );
    expect(exampleBlockId).toBeDefined();
    const id = Number(exampleBlockId);
    // lines 3..5 (block start..end) map to that block id
    expect(s.map[3]).toBe(id);
    expect(s.map[4]).toBe(id);
    expect(s.map[5]).toBe(id);
  });
});

describe("transformer: html output", () => {
  it("produces a styled container with icon and stores the accent hue as a CSS variable", async () => {
    const doc = "@def Markdown {\n    a lightweight markup language\n}";
    const html = await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true, spanState: state });
    // The accent is no longer a fixed light 70% colour resolved at render time: the
    // block stores only its hue via `--block-hue`, letting note.css pick a darker
    // lightness in light mode for contrast while keeping the vivid look in dark mode.
    expect(html).toContain("definition-block-container");
    expect(html).toContain('href="#compass"');
    expect(html).toMatch(/--block-hue:\s*\d+/);
    expect(html).not.toContain("hsl(");
  });

  it("falls back to chevron-right icon for unknown labels", async () => {
    const doc = "@customlabel hello {\n    content\n}";
    const html = await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true, spanState: state });
    expect(html).toContain('href="#chevron-right"');
  });

  it("drives accent colour, round stroke caps and theme contrast from note.css", () => {
    // Feather draws small accents such as the "?"-tail dot as a near-zero-length
    // <line>; with the default butt line-cap that segment paints nothing and the
    // dot disappears. Only `stroke-linecap: round` makes it a visible dot.
    expect(noteCss).toMatch(/\.block-icon\s*{[^}]*stroke-linecap:\s*round/s);
    // Accent colour comes from the per-block `--block-hue` combined with a
    // theme-dependent lightness built in CSS.
    expect(noteCss).toMatch(/--block-accent\s*:\s*hsl\(var\(--block-hue[^;]*\)/);
    expect(noteCss).toMatch(/stroke:\s*var\(--block-accent\)/);
    expect(noteCss).toMatch(/color:\s*var\(--block-accent\)/);
    // Light mode darkens the accent (45%) versus the vivid dark-mode default (70%).
    expect(noteCss).toMatch(/--block-lightness:\s*70%/);
    expect(noteCss).toMatch(/--block-lightness:\s*45%/);
    expect(noteCss).toMatch(/body\[data-theme="light"\]\s*{[^}]*--block-lightness:\s*45%/s);
  });
});
