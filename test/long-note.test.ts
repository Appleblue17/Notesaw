import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { DomOracle } from "./helpers/dom-oracle.ts";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, blockContents } from "./helpers/webview-dom.ts";

const LONG_NOTE = fileURLToPath(new URL("../long-note.md", import.meta.url));

function longNoteText(): string {
  return readFileSync(LONG_NOTE, "utf-8");
}

/**
 * Long-article editing. The incremental engine is designed to re-render only the
 * affected block range, so it must hold up on a real ~2000-line document: edits far
 * apart must not interfere, and a burst of rapid (balanced) edits must not lose or
 * drift. Each directed case is an isolated single-step check via the DOM oracle.
 */
describe("incremental: long-article editing (long-note.md)", () => {
  let oracle: DomOracle;

  beforeEach(() => {
    oracle = new DomOracle();
  });

  it(
    "keeps DOM consistent for a single edit at scattered structural sites",
    async () => {
      const text = longNoteText();
      const cases: Array<[string, (e: MockEditor) => any]> = [
        ["edit inside a display-math equation", (e) => e.setLine(23, "$$ f_w = w^T x + b $$")],
        ["insert a nested list item", (e) => e.insertBefore(16, "- New: transfer learning")],
        ["change a heading level", (e) => e.setLine(2, "## Regression")],
        ["edit a deep (line ~1700) paragraph", (e) => e.setLine(1696, "- Each point $i$ is connected with strength $q$.")],
        ["delete a @def block opener", (e) => e.delete(510, 510)],
        ["append a new line at the very end", (e) => e.insertBefore(text.split("\n").length + 1, "## The End")],
      ];
      for (const [label, mk] of cases) {
        oracle = new DomOracle();
        const seeded = await oracle.seed(text);
        const { inc, truth, drift } = await oracle.singleStep(seeded, mk(seeded));
        expect(drift, `${label}: drifted`).toBe(0);
        expect(inc, label).toEqual(truth);
      }
    },
    120_000,
  );

  it(
    "keeps DOM consistent for a fresh sibling block inserted at top/middle/bottom",
    async () => {
      const text = longNoteText();
      for (const [label, at] of [
        ["top @def block", 4],
        ["middle @alg block", 546],
        ["deep @thm block", 628],
      ] as Array<[string, number]>) {
        oracle = new DomOracle();
        const seeded = await oracle.seed(text);
        const { inc, truth } = await oracle.singleStep(
          seeded,
          seeded.insertBefore(at, `@tip Inserted near ${label} {\n    note body\n}`),
        );
        expect(inc, label).toEqual(truth);
      }
    },
    120_000,
  );
});

/**
 * Known issue (Finding A): inserting an UNCLOSED block opener (`@label Title {`, a
 * legitimate mid-typing state) produces an incremental fragment whose EOF closes the
 * opened block EARLIER than a full render of the same document would. The fragment
 * range is bounded by the partial x/y, so a block opened at the range start swallows
 * only content up to the fragment end, whereas the full render's EOF-close would
 * swallow further. Result: incremental and full disagree on the block's extent.
 * Recorded as an expected failure to be root-caused (structure-health detection).
 */
describe("incremental: unclosed block opener vs full render (known issue)", () => {
  it.fails("incremental fragment swallows less than a clean full render", async () => {
    const oracle = new DomOracle();
    const e = await oracle.seed([
      "@def A {",
      "    body",
      "}",
      "",
      "## Heading",
      "Some text here.",
    ].join("\n"));
    // insert an unclosed @note opener right before the heading
    const { inc, truth } = await oracle.singleStep(e, e.insertBefore(5, "@note note in the middle {"));
    expect(inc).toEqual(truth);
  });
});

/**
 * Known issue (Finding B): under a burst of rapid but balanced edits, the engine
 * eventually returns a `partial` decision whose `fat` anchor (the LCA parent id) is a
 * ghost id that no longer exists in the DOM, so `partialUpdateHtml` cannot locate it
 * and the webview requests a full refresh ("parent id not found"). This is exactly the
 * "定位失败 → full" degradation the user wants eliminated. Recorded as expected failure.
 */
describe("incremental: rapid balanced edit burst on a long note (known issue)", () => {
  it.fails("never degrades to a full refresh across 120 rapid edits", async () => {
    const renderer = new IncrementalRenderer();
    const host = bootstrapWebview();
    const editor = new MockEditor(longNoteText());
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    const initialLines = editor.lineCount;

    // Deterministic pseudo-random burst of balanced, realistic edits.
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < 120 && host.refreshCount() === 0; i++) {
      const op = i % 6;
      const at =
        op === 0
          ? 3 + (i % 6)
          : op === 2
            ? 1 + Math.floor(initialLines / 2) + (i % 12)
            : op === 4
              ? Math.max(1, initialLines - 3 - (i % 6))
              : 1 + Math.floor(rnd() * Math.max(1, initialLines - 10));
      const pick = (arr: string[]) => arr[i % arr.length];
      const textLines = [
        "- a fresh bullet with **bold**",
        "$$ x = \\frac{a}{b} $$",
        "plain paragraph *em* line",
        "| c1 | c2 |\n|---|---|\n| a | b |",
      ];
      const ch =
        op === 2
          ? editor.delete(Math.min(at, editor.lineCount), Math.min(at, editor.lineCount))
          : op === 4
            ? editor.insertBefore(Math.min(at, editor.lineCount), "@note new block {\n    body here\n}")
            : op === 5
              ? editor.setLine(Math.min(at, editor.lineCount), pick(textLines))
              : editor.insertBefore(Math.min(at, editor.lineCount), pick(textLines));

      editor.apply(ch);
      const decision = await renderer.update(editor, ch);
      if (decision.kind === "partial" && decision.raw !== undefined) {
        host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
      } else {
        host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
      }
    }

    expect(host.refreshCount()).toBe(0);
  }, 300000);
});
