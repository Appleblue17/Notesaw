import { describe, it, expect, beforeEach } from "vitest";
import { DomOracle } from "./helpers/dom-oracle.ts";

describe("incremental renderer: DOM consistency (edge cases)", () => {
  let oracle: DomOracle;

  beforeEach(() => {
    oracle = new DomOracle();
  });

  it("handles nested blocks inside a block", async () => {
    const init = [
      "@example outer",
      "{",
      "    @note inner one",
      "    {",
      "        inner body",
      "    }",
      "    trailing",
      "}",
    ].join("\n");
    let e = await oracle.seed(init);
    const r1 = await oracle.singleStep(e, e.delete(5, 5));
    expect(r1.inc).toEqual(r1.truth);
    const r2 = await oracle.singleStep(e, e.insertBefore(3, "    @tip leaf\n    {\n        extra\n    }"));
    expect(r2.inc).toEqual(r2.truth);
  });

  it("survives a large multi-block deletion", async () => {
    const init = Array.from({ length: 8 }, (_, i) => [`@def Block${i} {`, "    content", "}", ""]).flat().join("\n");
    const e = await oracle.seed(init);
    const { inc, truth } = await oracle.singleStep(e, e.delete(5, 16));
    expect(inc).toEqual(truth);
  });

  it("shrinks toward a short document", async () => {
    const init = ["@def A {", "    one", "}", "@def B {", "    two", "}", "@def C {", "    three", "}"].join("\n");
    const e = await oracle.seed(init);
    const { inc, truth } = await oracle.singleStep(e, e.delete(2, 9));
    expect(inc).toEqual(truth);
  });

  it("edits right around a block's opening brace line", async () => {
    const init = ["@example hello", "{", "    body", "}", "# heading"].join("\n");
    let e = await oracle.seed(init);
    const r1 = await oracle.singleStep(e, e.insertBefore(5, "between text"));
    expect(r1.inc).toEqual(r1.truth);
    const r2 = await oracle.singleStep(e, e.setLine(3, "    changed body"));
    expect(r2.inc).toEqual(r2.truth);
  });
});
