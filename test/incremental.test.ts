import { describe, it, expect, beforeEach } from "vitest";
import { DomOracle } from "./helpers/dom-oracle.ts";

/**
 * DOM-based incremental consistency: after an edit, the preview's `.block-container`
 * contents must equal a clean full render of the result. Uses the trustworthy DOM
 * oracle (id-independent), not the earlier unreliable span-map fingerprints.
 */
describe("incremental renderer: DOM consistency", () => {
  let oracle: DomOracle;

  beforeEach(() => {
    oracle = new DomOracle();
  });

  it("deleting content inside a block", async () => {
    const init = ["intro", "", "@example hello", "{", "    line one", "    line two", "}", "", "trailer"].join("\n");
    const e = await oracle.seed(init);
    const { inc, truth } = await oracle.singleStep(e, e.delete(5, 5));
    expect(inc).toEqual(truth);
  });

  it("inserting a new block between two existing ones", async () => {
    const init = ["@example one", "{", "    body", "}", "", "@note two", "{", "    body", "}"].join("\n");
    const e = await oracle.seed(init);
    const change = e.insertBefore(6, "@tip mid\n{\n    inserted\n}");
    const { inc, truth } = await oracle.singleStep(e, change);
    expect(inc).toEqual(truth);
  });

  it("deleting an entire block", async () => {
    const init = ["@example one", "{", "    body", "}", "", "@note two", "{", "    body", "}"].join("\n");
    const e = await oracle.seed(init);
    const { inc, truth } = await oracle.singleStep(e, e.delete(6, 9));
    expect(inc).toEqual(truth);
  });

  it("multi-step insert and delete sequence (DOM checked at each step)", async () => {
    const init = ["@def A {", "    one", "}", "", "@def B {", "    two", "}"].join("\n");
    const e = await oracle.seed(init);

    const ins = e.insertBefore(4, "some *text*");
    const r1 = await oracle.singleStep(e, ins);
    expect(r1.inc).toEqual(r1.truth);

    const del = e.delete(4, 4);
    const r2 = await oracle.singleStep(e, del);
    expect(r2.inc).toEqual(r2.truth);
  });
});
