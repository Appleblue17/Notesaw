import { describe, it, expect, beforeEach } from "vitest";
import { DomOracle } from "./helpers/dom-oracle.ts";

/**
 * Isolate which family of destructive/structural edit breaks incremental
 * maintenance. Each case applies ONE edit from a clean doc and asserts that the
 * incremental DOM equals a clean full render of the result — so a failure pins a
 * single maintenance bug rather than hiding inside a long random sequence.
 */
describe("incremental: single destructive edits stay consistent", () => {
  let oracle: DomOracle;
  beforeEach(() => { oracle = new DomOracle(); });

  const DOC = [
    "@def A {",
    "    one",
    "    two",
    "}",
    "",
    "@note B {",
    "    body",
    "}",
  ].join("\n");

  async function check(label: string, mk: (e: Awaited<ReturnType<DomOracle["seed"]>>) => Parameters<DomOracle["singleStep"]>[1]) {
    const e = await oracle.seed(DOC);
    const { inc, truth, drift } = await oracle.singleStep(e, mk(e));
    expect(drift, label + " drift").toBe(0);
    expect(inc, label).toEqual(truth);
  }

  it("delete the opening @label line of A", async () => check("del @label A", (e) => e.delete(1, 1)));
  it("delete the '{' line of A", async () => check("del { A", (e) => e.delete(1, 1)));
  it("delete A's first content line", async () => check("del first content", (e) => e.delete(2, 2)));
  it("delete A's middle content line", async () => check("del mid content", (e) => e.delete(3, 3)));
  it("delete A's closing '}' line", async () => check("del } A", (e) => e.delete(4, 4)));
  it("replace A's @def line with a quote", async () => check("setLine A→quote", (e) => e.setLine(1, "> x")));
  it("replace B's opening with another label", async () => check("setLine B label→tip", (e) => e.setLine(6, "@tip C {")));
  it("blank out one of A's content lines", async () => check("blank A content", (e) => e.setLine(3, "")));
  it("insert a blank line inside A", async () => check("ins blank in A", (e) => e.insertBefore(3, "")));
  it("insert an un-indented line inside A", async () => check("ins unindented in A", (e) => e.insertBefore(3, "plain text")));

  // Deeper nesting: outer block containing two inner blocks.
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
  async function checkNested(label: string, mk: (e: Awaited<ReturnType<DomOracle["seed"]>>) => Parameters<DomOracle["singleStep"]>[1]) {
    const e = await oracle.seed(NESTED);
    const { inc, truth, drift } = await oracle.singleStep(e, mk(e));
    expect(drift, label + " drift").toBe(0);
    expect(inc, label).toEqual(truth);
  }
  it("nested: delete A's closing }", async () => checkNested("nested del } A", (e) => e.delete(4, 4)));
  it("nested: delete A's opening @def", async () => checkNested("nested del @def A", (e) => e.delete(2, 2)));
  it("nested: replace A's opening with quote", async () => checkNested("nested A→quote", (e) => e.setLine(2, "> q")));
});
