import noteProcess from "./note.ts";
import fs from "fs/promises";

const doc: string = await fs.readFile("./note_test/notenote2.md", "utf-8");
// console.log(doc);
const res: string = await noteProcess(doc);

await fs.writeFile("./output.html", res, "utf-8");
console.log("HTML exported to output.html");
