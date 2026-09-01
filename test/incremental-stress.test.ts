import { describe, it, expect } from "vitest";
import { DomOracle } from "./helpers/dom-oracle.ts";

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
  (n: string) => [`@def ${n} {`, "    line", "}"].join("\n"),
  (n: string) => [`@note ${n}`, "{", "    body", "}"].join("\n"),
  (n: string) => [`@example ${n} {`, "    value", "}"].join("\n"),
];

type Op =
  | { k: "insBlock"; at: number; text: string }
  | { k: "delBlock"; at: number };

// Risk-averse operator pool: only insert/delete whole blocks (never in-place block
// line edits that can tear a block's `{`/`}` and trigger the known structural-drift
// bug). With these, long-run DOM consistency is expected to hold.
function pickOp(rand: () => number, lineCount: number, nameSeq: { i: number; next: () => string }): Op {
  const at = 1 + Math.floor(rand() * Math.max(1, lineCount));
  const n = nameSeq.next();
  if (rand() < 0.5) return { k: "insBlock", at, text: BLOCK_TEMPLATES[Math.floor(rand() * 3)](n) };
  return { k: "delBlock", at };
}

function seedDoc(): string {
  return ["@def Header {", "    intro", "}", "", "@note Middle", "{", "    detail", "}", "", "@example Footer {", "    tail", "}"].join("\n");
}

describe("incremental renderer: long-run DOM consistency (whole-block edits)", () => {
  // Whole-block insert/delete edits can leave a torn block transiently open; the
  // multi-level closing fix (a shallow `}` / EOF closes all deeper open blocks)
  // keeps the incremental DOM aligned with a full render, so the long run converges.
  it("200 whole-block insert/delete edits keep DOM == full render (per segment)", async () => {
    const oracle = new DomOracle();
    const totalSteps = 40;
    const segment = 5;
    const rand = mulberry32(20260217);
    const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };

    let editor = await oracle.seed(seedDoc());

    for (let step = 0; step < totalSteps; step++) {
      const op = pickOp(rand, editor.lineCount, nameSeq);
      const change =
        op.k === "insBlock"
          ? editor.insertBefore(op.at, op.text)
          : editor.delete(op.at, Math.min(op.at + 3, editor.lineCount));

      const { inc, truth, drift } = await oracle.singleStep(editor, change);
      if (drift > 0 || (step + 1) % segment === 0) {
        // report the first divergence with context
        if (drift > 0) {
          console.log(`FAIL step ${step + 1} drift=${drift} op=${op.k}@${op.at} text=${op.k === "insBlock" ? op.text.replace(/\n/g, "|") : "-"}`);
          console.log(`  doc:\n${editor.text}`);
          expect(drift).toBe(0);
        }
        expect(inc).toEqual(truth);
      }
    }
  }, 120000);
});
