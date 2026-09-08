// Isolated reproducers for the residual `delete '}'` divergence, split out so each
// is a single stepped scenario you can drive with the debug tool / read in one go.
// These only re-create the scenario + print the engine context; they do NOT assert
// a fix, and the engine is left untouched.
import { it } from "vitest";
import { IncrementalRenderer } from "../src/incremental-renderer.ts";
import { MockEditor, resetEngineState } from "./helpers/render-sim.ts";
import { bootstrapWebview, blockContents } from "./helpers/webview-dom.ts";

function docOf(lines: string[]): string {
  return lines.join("\n");
}

async function repro(label: string, docText: string, deleteFrom: number, deleteTo: number) {
  const log = (s: string) => console.log(s);
  log(`\n########### ${label} ###########`);
  log(`[scenario doc]`);
  docText.split("\n").forEach((l, i) => log(`   ${String(i + 1).padStart(3)} | ${JSON.stringify(l)}`));
  log(`[op] delete lines [${deleteFrom}..${deleteTo}]`);

  resetEngineState();
  const renderer = new IncrementalRenderer();
  const host = bootstrapWebview();
  const editor = new MockEditor(docText);
  host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
  log(`[seed blocks] ${JSON.stringify(blockContents(host.window))}`);

  const ch = editor.delete(deleteFrom, deleteTo);
  editor.apply(ch);
  const decision = await renderer.update(editor, ch);
  log(`[decision] kind=${decision.kind} x=${decision.x} y=${decision.y} fat=${decision.fat}`);
  if (decision.kind === "partial" && decision.raw !== undefined) {
    host.window.partialUpdateHtml(decision.raw, decision.x!, decision.y!, decision.fat!);
  } else {
    host.window.document.body.innerHTML = await renderer.fullRender(editor, true);
  }
  const inc = blockContents(host.window);

  // truth
  resetEngineState();
  const fresh = new IncrementalRenderer();
  const tmp = new MockEditor(editor.text);
  const th = bootstrapWebview();
  th.window.document.body.innerHTML = await fresh.fullRender(tmp, true);
  const truth = blockContents(th.window);

  log(`[inc]   ${JSON.stringify(inc)}`);
  log(`[truth] ${JSON.stringify(truth)}`);
  log(`[parity]=${JSON.stringify(inc) === JSON.stringify(truth)}`);
  return { inc, truth };
}

const TOP = docOf([
  "@def A {",
  "    one",
  "    two",
  "}",
  "",
  "@note B {",
  "    body",
  "}",
]);

const NESTED = docOf([
  "@example Outer {",
  "    @def A {",
  "        one",
  "    }",
  "    @note B {",
  "        body",
  "    }",
  "}",
]);

it("repro top-level delete A's closing '}'", async () => {
  await repro("top-level delete '}' of A", TOP, 4, 4);
});
it("repro nested delete A's closing '}'", async () => {
  await repro("nested delete '}' of A", NESTED, 4, 4);
});
