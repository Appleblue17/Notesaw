import type { EditorDoc, LineChange } from "../../src/incremental-renderer.ts";
import { defaultSpanState } from "../../src/transformer.ts";

/**
 * Resets the renderers' shared default span state. With per-renderer `SpanState`
 * isolation this is mostly a no-op for correctness, but it keeps the module-default
 * state clean for any caller that relies on it.
 */
export function resetEngineState() {
  defaultSpanState.reset();
}

/** A tiny in-memory, line-oriented editor document satisfying the EditorDoc surface. */
export class MockEditor implements EditorDoc {
  private lines: string[];

  constructor(content: string) {
    this.lines = splitLines(content);
  }

  get lineCount(): number {
    return this.lines.length;
  }

  lineText(line: number): string {
    return this.lines[line - 1] ?? "";
  }

  getTextBetweenLines(start: number, end: number): string {
    return this.lines.slice(start - 1, end).join("\n");
  }

  get text(): string {
    return this.lines.join("\n");
  }

  /** Replaces lines [startLine, endLine] with the lines of `change.text`. */
  apply(change: LineChange): void {
    const before = this.lines.slice(0, change.startLine - 1);
    const after = this.lines.slice(change.endLine);
    this.lines = before.concat(splitLines(change.text), after);
  }

  /** LineChange to insert `text` before line `atLine`. */
  insertBefore(atLine: number, text: string): LineChange {
    return { startLine: atLine, endLine: atLine - 1, text };
  }

  /** LineChange to delete lines [startLine, endLine] (inclusive). */
  delete(startLine: number, endLine: number): LineChange {
    return { startLine, endLine, text: "" };
  }

  /** LineChange to replace a single line's content in place. */
  setLine(line: number, newText: string): LineChange {
    return { startLine: line, endLine: line, text: newText };
  }
}

function splitLines(s: string): string[] {
  if (s === "") return [""];
  return s.split(/\r?\n/);
}
