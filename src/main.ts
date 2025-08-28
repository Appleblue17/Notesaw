import noteProcess, { noteProcessPure } from "./note.ts";
import fs from "fs/promises";

const doc: string = await fs.readFile("./note_test/mathnote.note", "utf-8");
const res: string = await noteProcess(
  doc,
  "./assets/styles/note.css",
  "./assets/styles/github-markdown.css",
  "./assets/styles/katex.min.css",
  "./assets/icon/feather-sprite.svg",
  "./assets/script/morphdom-umd.min.js",
  "./assets/script/webview-script.js",
  "self"
);

// noteProcessPure(doc);
// const res = await noteProcessPure(doc);

await fs.writeFile("./output.html", res, "utf-8");
console.log("HTML exported to output.html");
