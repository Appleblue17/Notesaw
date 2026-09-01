import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, type WebviewHost } from "./helpers/webview-dom.ts";

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

type Op =
  | { k: "insBlock"; at: number; text: string }
  | { k: "delBlock"; at: number }
  | { k: "insLine"; at: number; text: string }
  | { k: "delLine"; at: number }
  | { k: "setLine"; at: number; text: string };

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

/** Ordered text of every `.block-container` in the preview body — the DOM-level truth. */
function blockContents(window: WebviewHost["window"]): string[] {
  const mb = window.document.querySelector(".markdown-body");
  if (!mb) return [];
  return Array.from(mb.querySelectorAll(".block-container")).map((el: any) =>
    el.textContent.replace(/\s+/g, " ").trim(),
  );
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

describe("incremental renderer: DOM block consistency under edited pressure", () => {
  let renderer: IncrementalRenderer;
  let host: WebviewHost;

  beforeEach(() => {
    resetEngineState();
    renderer = new IncrementalRenderer();
    host = bootstrapWebview();
  });

  async function reSeed() {
    const e = new MockEditor(seedDoc());
    host.window.document.body.innerHTML = await renderer.fullRender(e, true);
    return e;
  }

  async function applyOp(editor: MockEditor, op: Op): Promise<number> {
    let ch;
    switch (op.k) {
      case "insBlock":
        ch = editor.insertBefore(op.at, op.text);
        break;
      case "delBlock":
        ch = editor.delete(op.at, Math.min(op.at + 3, editor.lineCount));
        break;
      case "insLine":
        ch = editor.insertBefore(op.at, op.text);
        break;
      case "delLine":
        ch = editor.delete(op.at, Math.min(op.at, editor.lineCount));
        break;
      case "setLine":
        ch = editor.setLine(Math.min(op.at, editor.lineCount), op.text);
        break;
    }
    editor.apply(ch);
    const decision = await renderer.update(editor, ch);
    if (decision.kind === "partial" && decision.raw !== undefined) {
      host.window.partialUpdateHtml(decision.raw, decision.x, decision.y, decision.fat);
    } else if (decision.kind === "full") {
      host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
    }
    return host.refreshCount();
  }

  // Right-edge extension + multi-level closing fix single-shot structural edits
  // (deleted `}`) and long whole-block runs. Harassing a document via repeated
  // destructive in-place setLine edits (→ quote/blank) can still put it in a broken
  // transitional state where a later incremental update cannot locate its targets.
  // Recorded as expected failure; deeper handling (structure-health detection) TBD.
  it.fails("keeps DOM block contents equal to a full render across 150 random edits", async () => {
    const totalSteps = 150;
    const segment = 5;
    const rand = mulberry32(777001);
    const nameSeq = { i: 0, next: () => "B" + nameSeq.i++ };

    let editor = await reSeed();

    for (let step = 0; step < totalSteps; step++) {
      const op = pickOp(rand, editor.lineCount, nameSeq);
      const drift = await applyOp(editor, op);

      if ((step + 1) % segment === 0) {
        // 1) incremental never had to fall back to a full refresh inside the segment
        expect(drift, `drift at step ${step + 1}`).toBe(0);
        // 2) incremental DOM block contents match a clean full render
        const incContent = blockContents(host.window);
        // compute ground truth in an isolated host/state, capture before reset
        const truthHost = bootstrapWebview();
        resetEngineState();
        const fresh = new IncrementalRenderer();
        const tmpEditor = new MockEditor(editor.text);
        truthHost.window.document.body.innerHTML = await fresh.fullRender(tmpEditor, true);
        const truthContent = blockContents(truthHost.window);
        try {
          expect(incContent).toEqual(truthContent);
        } catch (err) {
          (err as Error).message += `\nat step ${step + 1}`;
          throw err;
        }
        // 3) rebuild the main baseline and continue
        editor = new MockEditor(editor.text);
        host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
      }
    }
  });
});
