// Stress debug dumper (mirrors incremental-stress.test.ts driver exactly).
//
// Replays the whole-block insert/delete stress (seed 20260217) and stops to dump
// whatever you ask. Like the other dumps it prints, per visible step:
//   - decision kind/x/y/fat,
//   - whether the webview partial could find its anchors (anchor-miss -> a full
//     request, i.e. the "drift" the oracle asserts must be 0),
//   - optionally source + engine snapshot + DOM tree at selected stops.
//
// Usage (same interaction as _debug_tool.test.ts — a single NS_STOP step):
//   npx vitest run test/_debug_stress.test.ts
//       NS_STOP unset | -1: only anchor-miss ("drift") steps print a one-line summary,
//       i.e. exactly what incremental-stress fails on (it tallies cumulative webview
//       full refreshes and asserts 0). Content/parity lists are irrelevant here.
//   NS_STOP=17 npx vitest run test/_debug_stress.test.ts
//       dump step 17 (zero-based; that's 1-based step 18) fully — pre-edit source +
//       engine map + per-id spans + DOM, then the decision + post state + drift-hit,
//       and then STOP: steps after 17 are NOT executed.
// Observed drift (anchor-miss) steps: zero-based 17 (insBlock @example B17, decision
// partial x=29 y=29 fat=23 with no matching DOM) and 27 (insBlock @def B27).
import { it } from "vitest";
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
];
function pickOp(rand: () => number, lineCount: number, nameSeq: { i: number; next: () => string }): Op {
  const at = 1 + Math.floor(rand() * Math.max(1, lineCount));
  const n = nameSeq.next();
  if (rand() < 0.5) return { k: "insBlock", at, text: BLOCK_TEMPLATES[Math.floor(rand() * 3)](n) };
  return { k: "delBlock", at };
}
type Op = { k: "insBlock"; at: number; text: string } | { k: "delBlock"; at: number };
function seedDoc(): string {
  return ["@def Header {", "    intro", "}", "", "@note Middle", "{", "    detail", "}", "", "@example Footer {", "    tail", "}"].join("\n");
}
async function truthBlocks(doc: string): Promise<string[]> {
  const h = bootstrapWebview();
  h.window.document.body.innerHTML = await renderFragment(doc, {
    baseLine: 0, fatherId: 0, labelRoot: true, spanState: new SpanState(),
  });
  return blockContents(h.window);
}

// If neither NS_STOP is set, only anchor-miss (drift) steps print a one-line summary.
// Set NS_STOP = zero-based step index (like NS_STEP in _debug_tool) to dump that step.
const STOP = process.env.NS_STOP !== undefined ? Number(process.env.NS_STOP) : -1; // -1 = only drift summary
const TOTAL = 40;

it("stress dump", async () => {
  const log = (m: string) => console.log(m);
  const renderer = new IncrementalRenderer();
  const host = bootstrapWebview();
  let editor = new MockEditor(seedDoc());
  host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
  const rand = mulberry32(20260217);
  const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };

  const anchorsOK = (dec: any) => {
    const fat = host.window.document.getElementById(String(dec.fat));
    if (!fat) return false;
    const kids = Array.from(fat.children);
    const xi = kids.findIndex((c: any) => String(c.id) === String(dec.x));
    const yi = kids.findIndex((c: any) => String(c.id) === String(dec.y));
    return xi !== -1 && yi !== -1 && xi <= yi;
  };

  const dumpState = (label: string, editorX: any) => {
    log(`\n===== ${label} =====`);
    log(`[source ${editorX.lineCount} lines]`);
    editorX.text.split("\n").forEach((l: string, i: number) => log(`   ${String(i + 1).padStart(3)} | ${JSON.stringify(l)}`));
    const snap = renderer.snapshot() as any;
    log(`[engine] totalLines=${snap.totalLines}`);
    let rl = "";
    for (let i = 1; i <= snap.totalLines; i++) rl += `${i}:${snap.map[i] ?? "-"} `;
    log(`[engine] map row->owner: ${rl.trim()}`);
    for (let id = 1; id < snap.mapFather.length; id++) {
      const f = snap.mapFather[id], d = snap.mapDepth[id], a = snap.mapStartLine[id], b = snap.mapEndLine[id];
      if (f == null || f < 0) continue;
      log(`[engine] id${id}: fat=${f} depth=${d} start=${a} end=${b}`);
    }
    log(`[dom] blocks = ${JSON.stringify(blockContents(host.window))}`);
  };

  for (let step = 0; step < TOTAL; step++) {
    const op = pickOp(rand, editor.lineCount, nameSeq);
    const change =
      op.k === "insBlock"
        ? editor.insertBefore(op.at, op.text)
        : editor.delete(op.at, Math.min(op.at + 3, editor.lineCount));
    const showThis = step === STOP; // like NS_STEP pauses the run and dumps
    if (showThis) {
      log(`\n--- NS_STOP=${STOP} => step ${step + 1} (zero-based ${step}) op=${JSON.stringify(op)} ---`);
      dumpState(`pre step ${step + 1}`, editor);
    }
    editor.apply(change);
    const dec = await renderer.update(editor, change);
    const ok = dec.kind === "partial" ? anchorsOK(dec) : null;
    const driftHit = ok === false; // webview would request a full refresh -> "drift"
    if (showThis) {
      log(`[decision] kind=${dec.kind} x=${dec.x} y=${dec.y} fat=${dec.fat} anchorFind=${ok === null ? "n/a(engine full)" : ok}`);
      if (dec.kind === "partial" && dec.raw !== undefined) {
        log(`[raw]`);
        log(dec.raw);
        log(`[counter after render] state.counter=${(renderer as any).spanState.counter}`);
        const ids = [...(dec.raw.matchAll(/id=(["'])(\d+)\1/g) || [])].map((m) => m[2]);
        log(`[ids in raw] ${JSON.stringify(ids)}`);
      }
    }
    if (dec.kind === "partial" && dec.raw !== undefined) {
      if (ok) host.window.partialUpdateHtml(dec.raw, dec.x!, dec.y!, dec.fat!);
      else host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    } else {
      host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    }
    if (showThis) {
      dumpState(`post step ${step + 1}`, editor);
      const inc = blockContents(host.window);
      const truth = await truthBlocks(editor.text);
      log(`[inc]        ${JSON.stringify(inc)}`);
      log(`[truth]      ${JSON.stringify(truth)}`);
      log(`[parity]     ${JSON.stringify(inc) === JSON.stringify(truth)}   <-- content only; NOT the stress failure`);
      log(`[drift-hit?] ${driftHit}   <-- THIS is what the stress test fails on`);
    } else if (driftHit) {
      log(`step ${step + 1}: anchor-miss -> webview full (drift). op=${JSON.stringify(op)}`);
    }
    // A requested stop point dumps that one step and stops the replay: later steps
    // are not executed at all.
    if (showThis) break;
  }
});
