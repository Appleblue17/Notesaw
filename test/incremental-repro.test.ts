import { describe, it, expect, beforeEach } from "vitest";
import { DomOracle } from "./helpers/dom-oracle.ts";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, blockContents } from "./helpers/webview-dom.ts";

describe("incremental renderer: reported issue repros (DOM oracle)", () => {
  let oracle: DomOracle;

  beforeEach(() => {
    oracle = new DomOracle();
  });

  it("README Issue 1: deleting inside AND outside a block in one change", async () => {
    const init = ["before", "", "@example goal", "{", "    alpha", "    beta", "}", "", "after"].join("\n");
    const e = await oracle.seed(init);
    const { inc, truth } = await oracle.singleStep(e, e.delete(5, 8));
    expect(inc).toEqual(truth);
  });

  it("deleting a block plus its trailing blank line", async () => {
    const init = ["@note before", "{", "    x", "}", "", "@tip gone", "{", "    y", "}", "", "tail"].join("\n");
    const e = await oracle.seed(init);
    const { inc, truth } = await oracle.singleStep(e, e.delete(6, 10));
    expect(inc).toEqual(truth);
  });

  it("rapid single-line edits near block boundaries (DOM checked at each step)", async () => {
    const init = ["@def A {", "    one", "}", "", "@def B {", "    two", "}", "@def C {", "    three", "}"].join("\n");
    let e = await oracle.seed(init);
    for (let k = 0; k < 5; k++) {
      const ins = e.insertBefore(5, "mid *text*");
      const r1 = await oracle.singleStep(e, ins);
      expect(r1.inc).toEqual(r1.truth);
      const del = e.delete(5, 5);
      const r2 = await oracle.singleStep(e, del);
      expect(r2.inc).toEqual(r2.truth);
    }
  });

  it("the DOM oracle has teeth: two different docs yield different block contents", async () => {
    const a = "@def A {\n};";
    const b = "@def A {\n    x\n}";
    resetEngineState();
    const ra = new IncrementalRenderer();
    const thA = bootstrapWebview();
    thA.window.document.body.innerHTML = await ra.fullRender(new MockEditor(a), true);
    const ca = blockContents(thA.window);
    resetEngineState();
    const rb = new IncrementalRenderer();
    const thB = bootstrapWebview();
    thB.window.document.body.innerHTML = await rb.fullRender(new MockEditor(b), true);
    const cb = blockContents(thB.window);
    expect(JSON.stringify(ca)).not.toBe(JSON.stringify(cb));
  });
});
