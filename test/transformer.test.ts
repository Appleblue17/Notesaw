import { describe, it, expect, beforeEach } from "vitest";
import { renderFragment } from "../src/core.ts";
import {
  counter,
  setCounter,
  map,
  mapFather,
  mapDepth,
  mapStartLine,
  mapEndLine,
} from "../src/transformer.ts";

/** Resets the transformer's global mutable bookkeeping between tests. */
function resetState() {
  setCounter(0);
  map.length = 1;
  map[0] = undefined;
  mapFather.length = 1;
  mapFather[0] = 0;
  mapDepth.length = 1;
  mapDepth[0] = -1;
  mapStartLine.length = 1;
  mapStartLine[0] = -1;
  mapEndLine.length = 1;
  mapEndLine[0] = -1;
}

beforeEach(() => {
  resetState();
});

describe("transformer: id and Map bookkeeping", () => {
  it("assigns sequential ids and records map entries for elements", async () => {
    const doc = "@example hello\n{\n    world\n}";
    await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true });

    // every element got an id > 0
    expect(counter).toBeGreaterThan(0);
    // mapStartLine/mapEndLine arrays indexed by id are populated
    expect(mapStartLine.length).toBe(counter + 1);
    expect(mapEndLine.length).toBe(counter + 1);
    // mapDepth/mapFather chains point at the root (id 0) for top-level elements
    expect(mapFather[1]).toBe(0);
  });

  it("maps document lines to the block that contains them", async () => {
    const doc = "intro line\n\n@example hello\n{\n    inside\n}\n\ntrailer";
    await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true });

    // find the id of the example block by scanning its start line
    const exampleBlockId = Object.keys(mapStartLine).find(
      (k) => mapStartLine[Number(k)] === 3, // block starts on line 3
    );
    expect(exampleBlockId).toBeDefined();
    const id = Number(exampleBlockId);
    // lines 3..5 (block start..end) map to that block id
    expect(map[3]).toBe(id);
    expect(map[4]).toBe(id);
    expect(map[5]).toBe(id);
  });
});

describe("transformer: html output", () => {
  it("produces a styled container with icon and auto color", async () => {
    const doc = "@def Markdown {\n    a lightweight markup language\n}";
    const html = await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true });
    expect(html).toContain("definition-block-container");
    expect(html).toContain('href="#compass"');
    expect(html).toContain(`hsl(`);
  });

  it("falls back to chevron-right icon for unknown labels", async () => {
    const doc = "@customlabel hello {\n    content\n}";
    const html = await renderFragment(doc, { baseLine: 0, fatherId: 0, labelRoot: true });
    expect(html).toContain('href="#chevron-right"');
  });
});
