/**
 * VS Code-faithful text edit model. One class owns the document text and applies an
 * `Edit` (`range`+`text`, 0-based `{line,character}` positions). It is the single,
 * authoritative source of the two numbers the incremental renderer needs from any
 * real editor change:
 *
 *   - `affectedOldLines`: the inclusive 1-based OLD line numbers the edit physically
 *     touched (so the engine knows which blocks to re-render), and
 *   - `totalLines`: the document line count afterwards (so the engine can shift maps).
 *
 * Everything (editor mock, engine decision, extension bridge) builds on this model so
 * all layers agree on what an edit does — no drifted hand-rolled line math.
 */

export interface Pos {
  /** 0-based line. */
  line: number;
  /** 0-based UTF-16 column within `line`. */
  character: number;
}

export interface Range {
  start: Pos;
  end: Pos;
}

export interface Edit {
  range: Range;
  text: string;
}

/** Geometry lines computed from the current text so positions ↔ offsets stay exact. */
interface Row {
  /** absolute char offset of the row's first character. */
  start: number;
  /** absolute offset just before the row's '\n'. */
  contentEnd: number;
  /** absolute offset right after the row's '\n' (next row's start), or text length. */
  afterBreak: number;
}

export class TextModel {
  private s: string;

  constructor(text: string) {
    this.s = text;
  }

  toString(): string {
    return this.s;
  }

  get length(): number {
    return this.s.length;
  }

  private rows(): Row[] {
    if (this.s === "") return [{ start: 0, contentEnd: 0, afterBreak: 0 }];
    const out: Row[] = [];
    let from = 0;
    for (;;) {
      const nl = this.s.indexOf("\n", from);
      if (nl === -1) {
        out.push({ start: from, contentEnd: this.s.length, afterBreak: this.s.length });
        break;
      }
      out.push({ start: from, contentEnd: nl, afterBreak: nl + 1 });
      from = nl + 1;
    }
    return out;
  }

  get lineCount(): number {
    return this.rows().length;
  }

  lineText(line0: number): string {
    const rows = this.rows();
    if (line0 < 0 || line0 >= rows.length) return "";
    return this.s.slice(rows[line0].start, rows[line0].contentEnd);
  }

  /** Absolute char offset of a (clamped) 0-based position. */
  offsetAt(p: Pos): number {
    const rows = this.rows();
    const li = Math.max(0, Math.min(p.line, rows.length - 1));
    const r = rows[li];
    const col = Math.max(0, Math.min(p.character, r.contentEnd - r.start));
    return r.start + col;
  }

  /**
   * Applies `edit` to the text and reports the OLD line span touched.
   * Never mutates geometry before reporting (we capture inputs up front).
   * The returned `affectedOldLines` uses 1-based inclusive numbering for the engine.
   */
  apply(edit: Edit): { oldFirst: number; oldLast: number } {
    const rowsBefore = this.rows();
    const lo = Math.min(edit.range.start.line, edit.range.end.line);
    const hi = Math.max(edit.range.start.line, edit.range.end.line);
    const oldFirst = lo + 1; // 1-based
    const oldLast = hi + 1; // 1-based

    const os = this.offsetAt(edit.range.start);
    const oe = this.offsetAt(edit.range.end);
    this.s = this.s.slice(0, os) + edit.text + this.s.slice(oe);
    return { oldFirst, oldLast };
  }

  /**
   * Net whole-line delta introduced by applying this edit (used to shift row maps).
   * Positive => the document gained that many lines.
   */
  static netLineDelta(edit: Edit): number {
    let nl = 0;
    for (let i = 0; i < edit.text.length; i++) if (edit.text[i] === "\n") nl++;
    return nl - (edit.range.end.line - edit.range.start.line);
  }
}
