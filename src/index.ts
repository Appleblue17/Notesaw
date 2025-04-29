import type { Node, Point } from "unist";

export interface NoteNode extends Node {
  type: string;
  children: NoteNode[];
  position?: {
    start: Point;
    end: Point;
  };
  data?: {
    hName?: string; // HTML tag name
    hProperties?: { [key: string]: any }; // HTML attributes
    hChildren?: NoteNode[]; // Children of the HTML element
  };
  [key: string]: any; // Allow any additional properties
}
