import { describe, it, expect } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor } from "./helpers/render-sim.ts";
import { bootstrapWebview, blockContents } from "./helpers/webview-dom.ts";
import { renderFragment } from "../src/core.ts";
import { SpanState } from "../src/transformer.ts";

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
  (n: string) => [`@tip ${n}`, "{", "    tip", "}"].join("\n"),
];
type Op = { k: string; at?: number; text?: string };
function pickOp(rand: () => number, lineCount: number, nameSeq: { i: number; next: () => string }): Op {
  const r = rand();
  const at = 1 + Math.floor(rand() * Math.max(1, lineCount));
  const n = nameSeq.next();
  if (r < 0.3) return { k: "insBlock", at, text: BLOCK_TEMPLATES[Math.floor(rand() * 4)](n) };
  if (r < 0.42) return { k: "delBlock", at };
  if (r < 0.55) return { k: "insLine", at, text: "some *text* line" };
  if (r < 0.68) return { k: "delLine", at };
  const pools = ["plain paragraph text", "# Heading", "a `code` inline", "@note inline style", "", "> quote"];
  return { k: "setLine", at, text: pools[Math.floor(rand() * pools.length)] };
}

/** Clean full-render block contents using an ISOLATED SpanState (does not touch the engine). */
async function truthBlocks(doc: string): Promise<string[]> {
  const host = bootstrapWebview();
  host.window.document.body.innerHTML = await renderFragment(doc, {
    baseLine: 0,
    fatherId: 0,
    labelRoot: true,
    spanState: new SpanState(),
  });
  return blockContents(host.window);
}

describe("true continuous accumulation (per-step truth via isolated state)", () => {
  it.fails("replays press and reports the first step where incremental DOM != full", async () => {
    const r = new IncrementalRenderer();
    const host = bootstrapWebview();
    const seedText = ["@def Header {", "    intro", "}", "", "@note Middle", "{", "    detail", "}", "", "@example Footer {", "    tail", "}"].join("\n");
    let e = new MockEditor(seedText);
    host.window.document.body.innerHTML = await r.fullRender(e, true);
    const rand = mulberry32(777001);
    const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };

    let firstDrift = -1;
    for (let step = 0; step < 40; step++) {
      const op = pickOp(rand, e.lineCount, nameSeq);
      let ch;
      switch (op.k) {
        case "insBlock": ch = e.insertBefore(op.at!, op.text!); break;
        case "delBlock": ch = e.delete(op.at!, Math.min(op.at! + 3, e.lineCount)); break;
        case "insLine": ch = e.insertBefore(op.at!, op.text!); break;
        case "delLine": ch = e.delete(op.at!, Math.min(op.at!, e.lineCount)); break;
        case "setLine": ch = e.setLine(Math.min(op.at!, e.lineCount), op.text!); break;
      }
      e.apply(ch);
      const dec = await r.update(e, ch);
      if (dec.kind === "partial" && dec.raw !== undefined) host.window.partialUpdateHtml(dec.raw!, dec.x!, dec.y!, dec.fat!);
      else host.window.document.body.innerHTML = await r.fullRender(e, true);

      const inc = blockContents(host.window);
      const truth = await truthBlocks(e.text);
      if (JSON.stringify(inc) !== JSON.stringify(truth)) {
        console.log(`\n=== FIRST DIVERGENCE at step ${step + 1} ===`);
        console.log(`op=${JSON.stringify(op)}`);       
        console.log(`inc=${JSON.stringify(inc)}`);
        console.log(`truth=${JSON.stringify(truth)}`);
        console.log(`doc:\n${e.text}`);
        firstDrift = step + 1;
        break;
      }
      // report progress periodically
      if ((step + 1) % 5 === 0) console.log(`[ok] through step ${step + 1}`);
    }
    expect(firstDrift).toBe(-1);
  }, 60000);
});
