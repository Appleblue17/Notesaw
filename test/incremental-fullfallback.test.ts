import { describe, it, expect } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor } from "./helpers/render-sim.ts";
import { bootstrapWebview, applyDecisionAndStats, blockContents, type WebviewHost } from "./helpers/webview-dom.ts";
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

const SEED_DOC = [
  "@def Header {", "    intro", "}", "",
  "@note Middle", "{", "    detail", "}", "",
  "@example Footer {", "    tail", "}",
].join("\n");

/** Clean full-render block-contents of `doc` in an ISOLATED state (no engine interference). */
async function truthBlocks(doc: string): Promise<string[]> {
  const host = bootstrapWebview();
  host.window.document.body.innerHTML = await renderFragment(doc, {
    baseLine: 0, fatherId: 0, labelRoot: true, spanState: new SpanState(),
  });
  return blockContents(host.window);
}

/**
 * Directive-1 observability metric.
 *
 * A "give-up and re-render the whole document" fallback — whether the ENGINE opts to
 * (`{kind:"full"}`) or the WEBVIEW requests it (`requestFullRefresh`) — is treated as
 * a first-class finding and counted, never silently swallowed. This runs the full
 * randomized sequence to completion, tallies every fallback, and asserts ZERO as the
 * invariant. Currently the engine degrades on ~1/5 steps, so this is recorded
 * `it.fails`: the summary line is what makes each degradation visible and lets us
 * track progress toward zero.
 */
describe("incremental full-render fallbacks are observable (directive 1)", () => {
  it.fails("runs press with ZERO full fallbacks (engine or webview) across 150 steps", async () => {
    const r = new IncrementalRenderer();
    const host = bootstrapWebview();
    let e = new MockEditor(SEED_DOC);
    host.window.document.body.innerHTML = await r.fullRender(e, true);
    const rand = mulberry32(777001);
    const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };

    let engineFullTotal = 0;
    let webviewFullTotal = 0;
    let divergenceSteps: number[] = [];
    const fallbackSteps: Array<{ step: number; engine: number; webview: number; reason: string }> = [];

    let engineBaseline = r.fullFallbackCount;
    let webviewBaseline = host.refreshCount();

    for (let step = 0; step < 150; step++) {
      const op = pickOp(rand, e.lineCount, nameSeq);
      let ch;
      switch (op.k) {
        case "insBlock": ch = e.insertBefore(op.at!, op.text!); break;
        case "delBlock": ch = e.delete(op.at!, Math.min(op.at! + 3, e.lineCount)); break;
        case "insLine": ch = e.insertBefore(op.at!, op.text!); break;
        case "delLine": ch = e.delete(op.at!, Math.min(op.at!, e.lineCount)); break;
        case "setLine": ch = e.setLine(Math.min(op.at!, e.lineCount), op.text!); break;
      }
      const out = await applyDecisionAndStats(r, host, e, ch, engineBaseline, webviewBaseline);
      engineFullTotal += out.engineFull;
      webviewFullTotal += out.webviewFull;
      engineBaseline = r.fullFallbackCount;
      webviewBaseline = host.refreshCount();

      if (out.engineFull > 0 || out.webviewFull > 0) {
        const reason = r.fullFallbackReasons[r.fullFallbackReasons.length - 1] ?? "(webview)";
        fallbackSteps.push({ step: step + 1, engine: out.engineFull, webview: out.webviewFull, reason });
      }
      // DOM consistency only matters when the step did NOT fall back to full.
      if (out.engineFull === 0 && out.webviewFull === 0) {
        const truth = await truthBlocks(e.text);
        if (JSON.stringify(out.inc) !== JSON.stringify(truth)) divergenceSteps.push(step + 1);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `FULL FALLBACK summary over 150 steps: engine=${engineFullTotal} webview=${webviewFullTotal} (${fallbackSteps.length} steps affected); ` +
        `pure-partial DOM divergence steps=${JSON.stringify(divergenceSteps)}`,
    );
    // eslint-disable-next-line no-console
    console.log(
      "affected steps: " + JSON.stringify(fallbackSteps.map((s) => s.step)),
    );
    if (fallbackSteps.length) {
      const r1 = fallbackSteps[0].reason;
      // eslint-disable-next-line no-console
      console.log(`first fallback reason: ${r1}`);
    }

    expect(engineFullTotal + webviewFullTotal).toBe(0);
    expect(divergenceSteps).toEqual([]);
  }, 120000);
});
