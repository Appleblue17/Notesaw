/**
 * VSCode-faithful test editor built on TextModel.
 *
 * The engine, the mock editor, and (eventually) the extension bridge must all agree
 * on what an edit does. The one authoritative geometry is `TextModel` (see
 * `src/vscode-edit.ts`), which applies a real vscode-style `Edit` (`range`+`text`,
 * 0-based `{line,character}` positions). This module exposes a MockEditor over that
 * model whose high-level document operations (set/insert/delete a line, insert a
 * run of lines) each yield a genuine `Edit` whose `range`/`text` describe exactly
 * what a vscode edit object would carry — never an inverted or guessed span.
 */

import type { Edit } from "../../src/vscode-edit.ts";
import { TextModel } from "../../src/vscode-edit.ts";
import { defaultSpanState } from "../../src/transformer.ts";

/** Resets the renderers' shared default span state (kept for legacy callers). */
export function resetEngineState() {
  defaultSpanState.reset();
}

/**
 * A tiny document editor whose content is a single authoritative `TextModel`.
 * All mutations go through `TextModel.apply(edit)`; high-level operations derive the
 * exact `Edit` object up front (reading line geometry from the model), so the mock
 * and the engine always share the real, vscode-consistent numbers.
 */
export class MockEditor {
  private model: TextModel;

  constructor(content: string) {
    this.model = new TextModel(content);
  }

  get lineCount(): number {
    return this.model.lineCount;
  }

  lineText(line: number): string {
    return this.model.lineText(line - 1);
  }

  getTextBetweenLines(start: number, end: number): string {
    const out: string[] = [];
    for (let i = start; i <= end; i++) out.push(this.model.lineText(i - 1));
    return out.join("\n");
  }

  get text(): string {
    return this.model.toString();
  }

  /** Applies a vscode-style `Edit` to the underlying model. */
  apply(edit: Edit): void {
    this.model.apply(edit);
  }

  /**
   * Replaces the whole content of 1-based `line` with `newText` (no newline).
   * Returns the exact vscode `Edit` describing that single-line replacement.
   */
  setLine(line: number, newText: string): Edit {
    const i = line - 1;
    const cur = this.model.lineText(i);
    return {
      range: { start: { line: i, character: 0 }, end: { line: i, character: cur.length } },
      text: newText,
    };
  }

  /**
   * Deletes 1-based lines `[first, last]` inclusive as a single vscode `Edit`
   * consuming from the start of `first` through the end of `last`.
   */
  delete(first: number, last: number): Edit {
    const f = first - 1;
    const l = last - 1;
    return {
      range: {
        start: { line: f, character: 0 },
        end: { line: l, character: this.model.lineText(l).length },
      },
      text: "",
    };
  }

  /**
   * Inserts `text` as its own fresh line(s) before 1-based `atLine`, keeping the
   * original `atLine` content on a following untouched line. The produced `Edit` is
   * a genuine empty-range insertion whose text ends with a newline so the old line
   * begins at a fresh row — exactly what a document editing that keeps `atLine`
   * intact would do.
   */
  insertBefore(atLine: number, text: string): Edit {
    const i = atLine - 1;
    const insert = text.endsWith("\n") ? text : text + "\n";
    return {
      range: { start: { line: i, character: 0 }, end: { line: i, character: 0 } },
      text: insert,
    };
  }

  /**
   * A raw vscode-style edit by explicit position/range (for tests that model real
   * in-line typing / pasting at a character offset).
   */
  rawEdit(start: { line: number; character: number }, end: { line: number; character: number }, text: string): Edit {
    return { range: { start, end }, text };
  }
}
