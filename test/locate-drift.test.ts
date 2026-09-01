import { describe, it, expect } from "vitest";
import { DomOracle } from "./helpers/dom-oracle.ts";

function seedDoc(): string {
  return ["@def Header {", "    intro", "}", "", "@note Middle", "{", "    detail", "}", "", "@example Footer {", "    tail", "}"].join("\n");
}describe("locate minimal insert-position drift", () => {
  it("finds an insert position where a single partial update drifts", async () => {
    const failing: string[] = [];
    for (let at = 1; at <= seedDoc().split("\n").length + 1; at++) {
      const oracle = new DomOracle();
      const e = await oracle.seed(seedDoc());
      const ins = e.insertBefore(at, "@example N\n{\n    value\n}");
      const { inc, truth, drift } = await oracle.singleStep(e, ins);
      if (at === 13) {
        console.log(`[at13] inc=${JSON.stringify(inc)}`);
        console.log(`[at13] truth=${JSON.stringify(truth)}`);
      }
      if (drift > 0) {
        failing.push(`at=${at} (drift)`);
      } else if (JSON.stringify(inc) !== JSON.stringify(truth)) {
        failing.push(`at=${at} (content-divergence)`);
      }
    }
    expect(failing).toEqual([]);
  }, 60000);
});
