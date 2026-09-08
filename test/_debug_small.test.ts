// Small-case incremental debug dumper.
//
// Same ideas as _debug_tool.test.ts but for the tiny hand-written repros where a
// single "delete the closing '}'" step diverges — instead of the 150-step press
// sequence. No assertion, no engine change: you drive, you read.
//
// Case set:
//   a     top-level  @def A{…} @note B{…}          delete line 4 '}' of A  (FAILS)
//   b     nested     @example Outer{… A{…} B{…} }  delete line 4 '}' of A  (passes)
//
// Usage (repo root):
//   NS_CASE=a  npx vitest run test/_debug_small.test.ts   # dumps PRE then POST of 'a'
//   NS_CASE=b  npx vitest run test/_debug_small.test.ts   # dumps PRE then POST of 'b'
// Each run always prints the pristine pre-edit state (doc, map, engine, DOM) first,
// then applies the single delete and prints decision + post state + inc/truth.
import { it } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor } from "./helpers/render-sim.ts";
import { bootstrapWebview, blockContents } from "./helpers/webview-dom.ts";
import { renderFragment } from "../src/core.ts";
import { SpanState } from "../src/transformer.ts";

const TOP = [
  "@def A {",
  "    one",
  "    two",
  "}",
  "",
  "@note B {",
  "    body",
  "}",
].join("\n");
const NESTED = [
  "@example Outer {",
  "    @def A {",
  "        one",
  "    }",
  "    @note B {",
  "        body",
  "    }",
  "}",
].join("\n");

interface Case {
  name: string;
  doc: string;
  delFrom: number;
  delTo: number;
}
const CASES: Record<string, Case> = {
  a: { name: "top-level delete A '}'", doc: TOP, delFrom: 4, delTo: 4 },
  b: { name: "nested delete A '}'", doc: NESTED, delFrom: 4, delTo: 4 },
};

async function truthBlocks(doc: string): Promise<string[]> {
  const h = bootstrapWebview();
  h.window.document.body.innerHTML = await renderFragment(doc, {
    baseLine: 0, fatherId: 0, labelRoot: true, spanState: new SpanState(),
  });
  return blockContents(h.window);
}

it("small single-step case dump", async () => {
  const which = (process.env.NS_CASE ?? "a").toLowerCase();
  const c = CASES[which];
  const log = (m: string) => console.log(m);
  if (!c) {
    log(`unknown NS_CASE=$which ; valid: ${Object.keys(CASES).join(", ")}`);
    return;
  }

  const dump = (renderer: IncrementalRenderer, host: any, editor: any, label: string, showDom: boolean) => {
    log(`\n===== ${label} =====`);
    log(`[source ${editor.lineCount} lines]`);
    editor.text.split("\n").forEach((l: string, i: number) => log(`   ${String(i + 1).padStart(3)} | ${JSON.stringify(l)}`));
    const snap = renderer.snapshot() as any;
    log(`[engine] totalLines=${snap.totalLines}`);
    let rl = "";
    for (let i = 1; i <= snap.totalLines; i++) rl += `${i}:${snap.map[i] ?? "-"} `;
    log(`[engine] map row->owner: ${rl.trim()}`);
    log(`[history?] (per-id spans)`);
    for (let id = 1; id < snap.mapFather.length; id++) {
      const f = snap.mapFather[id], d = snap.mapDepth[id], a = snap.mapStartLine[id], b = snap.mapEndLine[id];
      if (f == null || f < 0) continue;
      log(`[engine] id${id}: fat=${f} depth=${d} start=${a} end=${b}`);
    }
    const show = (el: any, ind: string) => {
      if (!el || el.tagName === undefined) return;
      const id = el.getAttribute?.("id") ?? (el as any).id ?? "";
      const cls = (el.getAttribute?.("class") ?? "").toString().split(" ")[0] || "";
      const txt = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 34);
      log(`   ${ind}<${el.tagName.toLowerCase()}${id ? ` #${id}` : ""}${cls ? ` .${cls}` : ""}> "${txt}"`);
      for (const ch of Array.from(el.childNodes || [])) if (ch.nodeType === 1) show(ch, ind + "   ");
    };
    if (showDom) {
      log(`[dom] blocks = ${JSON.stringify(blockContents(host.window))}`);
      log(`[dom] tree:`);
      show(host.window.document.querySelector(".markdown-body"), "");
    }
  };

  // seed fresh
  const renderer = new IncrementalRenderer();
  const host = bootstrapWebview();
  const editor = new MockEditor(c.doc);
  host.window.document.body.innerHTML = await renderer.fullRender(editor, true);

  // -- BEFORE the operation --
  dump(renderer, host, editor, `PRISTINE (case ${c.name}) before the edit`, true);

  log(`\n[op about to apply] delete lines ${c.delFrom}..${c.delTo}  (${c.name})`);
  const ch = editor.delete(c.delFrom, c.delTo);
  editor.apply(ch);
  const decision = await renderer.update(editor, ch);
  log(`[decision] kind=${decision.kind} x=${decision.x} y=${decision.y} fat=${decision.fat}`);
  if (decision.kind === "partial" && decision.raw !== undefined) {
    host.window.partialUpdateHtml(decision.raw, decision.x!, decision.y!, decision.fat!);
  } else {
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
  }
  log("\n[AFTER the delete step]");
  dump(renderer, host, editor, "after-step state", true);
  const inc = blockContents(host.window);
  const truth = await truthBlocks(editor.text);
  log(`\n[inc]   ${JSON.stringify(inc)}`);
  log(`[truth] ${JSON.stringify(truth)}`);
  log(`[parity]=${JSON.stringify(inc) === JSON.stringify(truth)}`);
});
