import type { Node, Point } from "unist";

export interface NoteNode extends Node {
  type: string;
  children: NoteNode[];
  position?: {
    start: Point;
    end: Point;
  };
  [key: string]: any; // Allow any additional properties
}
