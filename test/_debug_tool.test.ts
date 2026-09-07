// Incremental-renderer debug dump.
//
// Deterministic replay (seed 777001) of the "press" sequence. Recomputes which
// operation happens at each step IN ITS OWN playback, so the numbers are faithful.
//
// Modes:
//   NS_STEP=0      (default) dump the pristine seed document + empty-engine map.
//   NS_STEP=28     apply 28 edits, then dump: source, engine snapshot, DOM tree.
//   NS_STEP=28 NS_APPLY=1   apply 28 edits, dump pre-state, then apply the 29th
//                           edit and print its engine decision + inc-vs-truth list.
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
function seedDoc(): string {
  return ["@def Header {", "    intro", "}", "", "@note Middle", "{", "    detail", "}", "", "@example Footer {", "    tail", "}"].join("\n");
}
function makeEdit(editor: MockEditor, op: Op): any {
  const at = op.at;
  switch (op.k) {
    case "insBlock": return editor.insertBefore(at!, op.text!);
    case "delBlock": return editor.delete(at!, Math.min(at! + 3, editor.lineCount));
    case "insLine": return editor.insertBefore(at!, op.text!);
    case "delLine": return editor.delete(at!, Math.min(at!, editor.lineCount));
    case "setLine": return editor.setLine(Math.min(at!, editor.lineCount), op.text!);
  }
}
async function truthBlocks(doc: string): Promise<string[]> {
  const h = bootstrapWebview();
  h.window.document.body.innerHTML = await renderFragment(doc, {
    baseLine: 0, fatherId: 0, labelRoot: true, spanState: new SpanState(),
  });
  return blockContents(h.window);
}

const STEP = Math.max(0, Number(process.env.NS_STEP ?? "0"));
const APPLY = Number(process.env.NS_APPLY ?? "0") === 1;
const LOG = Number(process.env.NS_LOG ?? "0") === 1;

it("manual debug dump", async () => {
  const log = (m: string) => console.log(m);

  async function freshEngine() {
    const renderer = new IncrementalRenderer();
    const host = bootstrapWebview();
    const editor = new MockEditor(seedDoc());
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    return { renderer, host, editor };
  }

  async function replay(count: number) {
    const { renderer, host, editor } = await freshEngine();
    const rand = mulberry32(777001);
    const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };
    for (let s = 0; s < count; s++) {
      const op = pickOp(rand, editor.lineCount, nameSeq);
      const ch = makeEdit(editor, op);
      editor.apply(ch);
      const dec = await renderer.update(editor, ch);
      if (dec.kind === "partial" && dec.raw !== undefined) host.window.partialUpdateHtml(dec.raw!, dec.x!, dec.y!, dec.fat!);
      else host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    }
    return { renderer, host, editor, lastOp: null as Op | null };
  }

  function pick(index: number): Op {
    const rand = mulberry32(777001);
    const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };
    let tmp = new MockEditor(seedDoc());
    let last: Op = { k: "seed" };
    for (let s = 0; s < index; s++) {
      const op = pickOp(rand, tmp.lineCount, nameSeq);
      last = op;
      tmp.apply(makeEdit(tmp, op));
    }
    return last;
  }

  function dumpRenderer(renderer: IncrementalRenderer, host: any, editor: any, label: string) {
    if (!LOG) return;
    log(`\n===== ${label} =====`);
    log(`[source ${editor.lineCount} lines]`);
    editor.text.split("\n").forEach((l: string, i: number) => log(`   ${String(i + 1).padStart(3)} | ${JSON.stringify(l)}`));
    const snap = renderer.snapshot() as any;
    log(`[engine] totalLines=${snap.totalLines}  rowCount=${snap.map.length}`);
    let rl = "";
    for (let i = 1; i <= snap.totalLines; i++) rl += `${i}:${snap.map[i] ?? "-"} `;
    log(`[engine] map row->owner: ${rl.trim()}`);
    for (let id = 1; id < snap.mapFather.length; id++) {
      const f = snap.mapFather[id], d = snap.mapDepth[id], a = snap.mapStartLine[id], b = snap.mapEndLine[id];
      if (f == null || f < 0) continue;
      log(`[engine] id${id}: fat=${f} depth=${d} start=${a} end=${b}`);
    }
    // log(`[dom] blocks = ${JSON.stringify(blockContents(host.window))}`);
    // log("  .markdown-body tree:");
    // const rec = (el: any, ind: string) => {
    //   if (!el || el.tagName === undefined) return;
    //   const id = el.getAttribute?.("id") ?? (el as any).id ?? "";
    //   const cls = (el.getAttribute?.("class") ?? "").toString().split(" ")[0] || "";
    //   const txt = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 38);
    //   log(`   ${ind}<${el.tagName.toLowerCase()}${id ? ` #${id}` : ""}${cls ? ` .${cls}` : ""}> "${txt}"`);
    //   for (const c of Array.from(el.childNodes || [])) if (c.nodeType === 1) rec(c, ind + "   ");
    // };
    // rec(host.window.document.querySelector(".markdown-body"), "");
  }

  if (STEP === 0 && !APPLY) {
    const { renderer, host, editor } = await freshEngine();
    dumpRenderer(renderer, host, editor, "pristine seed (0 edits)");
    return;
  }

  if (APPLY) {
    // pre-state is after STEP edits (index STEP = the step's number). So STEP edits ran,
    // and the NEXT op is index STEP (1-based).
    const { renderer, host, editor } = await replay(STEP);
    dumpRenderer(renderer, host, editor, `pre-state after ${STEP} edits`);
    const nextOp = pick(STEP + 1); // that is the op whose index is STEP+1
    log(`[op about to apply] ${JSON.stringify(nextOp)}`);
    const ch = makeEdit(editor, nextOp);
    editor.apply(ch);
    const dec = await renderer.update(editor, ch);
    log(`[decision] kind=${dec.kind} x=${dec.x} y=${dec.y} fat=${dec.fat}`);
    if (dec.kind === "partial") {
      if (dec.raw === undefined) return;
      host.window.partialUpdateHtml(dec.raw, dec.x!, dec.y!, dec.fat!);
      const inc = blockContents(host.window);
      const truth = await truthBlocks(editor.text);
      log(`[inc]   ${JSON.stringify(inc)}`);
      log(`[truth] ${JSON.stringify(truth)}`);
      log(`[parity]=${JSON.stringify(inc) === JSON.stringify(truth)}`);
    }
    return;
  }

  // plain: apply STEP edits (STEP>=1)
  const { renderer, host, editor } = await replay(STEP);
  dumpRenderer(renderer, host, editor, `state after ${STEP} edits`);
});
