import noteProcess from "./note.ts";
import fs from "fs/promises";

const doc: string = await fs.readFile("./note_test/test.note", "utf-8");
// console.log(doc);
const res: string = await noteProcess(
  doc,
  "./assets/styles/note.css",
  "./assets/styles/github-markdown.css",
  "./assets/styles/katex.min.css",
  "./assets/icon/feather-sprite.svg",
  "self"
);

await fs.writeFile("./output.html", res, "utf-8");
console.log("HTML exported to output.html");
