import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import {
  MockEditor,
  resetEngineState,
  lineOwnFingerprint,
  groundTruthLineOwnership,
} from "./helpers/render-sim.ts";

// Deterministic PRNG (mulberry32) so randomized stress sequences are reproducible.
function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOCK_TEMPLATES = [
  (name: string) => [`@def ${name} {`, "    line", "}"].join("\n"),
  (name: string) => [`@note ${name}`, "{", "    body", "}"].join("\n"),
  (name: string) => [`@example ${name} {`, "    value", "}"].join("\n"),
];

type Op =
  | { kind: "insertBlock"; at: number; text: string }
  | { kind: "deleteBlock"; at: number }
  | { kind: "insertLine"; at: number; text: string }
  | { kind: "replaceLine"; at: number; text: string };

function pickOp(
  rand: () => number,
  lineCount: number,
  nameSeq: { i: number; next: () => string },
): Op {
  const r = rand();
  const at = 1 + Math.floor(rand() * Math.max(1, lineCount));
  const n = nameSeq.next();
  if (r < 0.35) {
    return { kind: "insertBlock", at, text: BLOCK_TEMPLATES[Math.floor(rand() * 3)](n) };
  }
  if (r < 0.55) return { kind: "deleteBlock", at };
  if (r < 0.8) {
    return { kind: "insertLine", at, text: rand() < 0.7 ? "some *text* line" : "" };
  }
  return { kind: "replaceLine", at, text: "edited line" + Math.floor(rand() * 100) };
}

async function applyOp(
  editor: MockEditor,
  renderer: IncrementalRenderer,
  op: Op,
) {
  let change;
  switch (op.kind) {
    case "insertBlock":
      change = editor.insertBefore(op.at, op.text);
      break;
    case "deleteBlock":
      change = editor.delete(op.at, Math.min(op.at + 3, editor.lineCount));
      break;
    case "insertLine":
      change = editor.insertBefore(op.at, op.text);
      break;
    case "replaceLine":
      change = editor.setLine(Math.min(op.at, editor.lineCount), op.text);
      break;
  }
  editor.apply(change);
  return renderer.update(editor, change);
}

function seedDoc(): string {
  return [
    "@def Header {",
    "    intro",
    "}",
    "",
    "@note Middle",
    "{",
    "    detail",
    "}",
    "",
    "@example Footer {",
    "    tail",
    "}",
  ].join("\n");
}

describe("incremental renderer: randomized stress", () => {
  let renderer: IncrementalRenderer;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
  });

  it("200 randomized edits stay convergent", async () => {
    const totalSteps = 200;
    const segment = 5;
    const rand = mulberry32(20260217);
    const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };

    let editor = new MockEditor(seedDoc());
    await renderer.fullRender(editor, true);

    for (let step = 0; step < totalSteps; step++) {
      const op = pickOp(rand, editor.lineCount, nameSeq);
      const decision = await applyOp(editor, renderer, op);
      // A full fallback mid-sequence is not necessarily wrong, but inconsistent
      // segments will be caught by the fingerprint check below.
      void decision;

      if ((step + 1) % segment === 0) {
        const truth = await groundTruthLineOwnership(editor.text);
        const ink = lineOwnFingerprint(renderer.snapshot());
        try {
          expect(ink).toEqual(truth);
        } catch (err) {
          (err as Error).message += `\nDivergence at step ${step + 1} (segment ending).`;
          throw err;
        }
        // Rebuild a clean baseline and continue from the same final text.
        editor = new MockEditor(editor.text);
        await renderer.fullRender(editor, true);
      }
    }
  }, 60000);
});
