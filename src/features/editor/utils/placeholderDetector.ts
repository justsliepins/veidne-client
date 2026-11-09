import type PizZip from 'pizzip';

/**
 * Finds placeholders that another mail merge tool (Word, docxtemplater,
 * Handlebars, Jinja, ...) left in an uploaded template, without changing it.
 *
 * Two kinds of result:
 *  - fields: a single value per document, which Veidne can take over;
 *  - controls: loops and conditions, which Veidne cannot execute, because it
 *    produces one document per spreadsheet row rather than repeating content
 *    inside one document.
 *
 * Every part a merge can touch is read: the body and every header and footer,
 * found through the document relationships and, as a fallback, by name.
 * Text is read per paragraph across runs, because Word splits a typed
 * placeholder like {{Name}} over several runs whenever spelling, formatting
 * or revision marks touch it. Word field codes are read across runs between
 * their begin and end markers for the same reason.
 *
 * The same walk serves mergeImport.ts, which rewrites what the user chose to
 * import: every finding carries a locator into the parsed part (the <w:t>
 * character spans of a typed placeholder, or the elements of a field code),
 * so the rewrite changes exactly what was shown to the user and nothing else.
 */

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_HEADER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header';
const REL_FOOTER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer';

export const BODY_PART = 'word/document.xml';

export type FieldFamily =
  /** Word MERGEFIELD code, w:fldSimple or fldChar begin/instrText/end. */
  | 'mergefield'
  /** << Name >> */
  | 'chevron'
  /** «Name» typed as text (Word shows MERGEFIELDs this way). */
  | 'guillemet'
  /** {{ Name }} */
  | 'doubleBrace'
  /** { Name } */
  | 'singleBrace'
  /** % Name % */
  | 'percent'
  /** ${Name} */
  | 'dollarBrace';

export const FIELD_FAMILIES: readonly FieldFamily[] = ['mergefield', 'chevron', 'guillemet', 'doubleBrace', 'singleBrace', 'percent', 'dollarBrace'];

export type ControlFamily =
  /** {{#each}} {{/each}} {{#if}} {{else}} {{^x}} and any {{#..}} / {{/..}} */
  | 'handlebars'
  /** {#items} {/items} {^items} (docxtemplater loops and conditions) */
  | 'docxtemplater'
  /** {% for %} {% endfor %} {% if %} ... */
  | 'jinja'
  /** Word IF, NEXT, NEXTIF, SKIPIF, MERGEREC, MERGESEQ field codes */
  | 'wordField';

/** Families with a meaningful false-positive rate on ordinary prose. */
export const LOW_CONFIDENCE_FAMILIES: ReadonlySet<FieldFamily> = new Set(['singleBrace', 'percent']);

export interface FieldOccurrence {
  /** Zip part, e.g. word/document.xml or word/header2.xml. */
  part: string;
  /** Ordinal of the paragraph within the part, in tree order (nested text-box
   *  paragraphs counted where they start). */
  paragraph: number;
  /** The text as it appears in the document, e.g. "{{ Name }}" or the full
   *  MERGEFIELD instruction. */
  raw: string;
  /** Exactly {{Name}}, the form Veidne itself writes. */
  canonical?: boolean;
  /** A MERGEFIELD with a date (\@) or number (\#) format switch, which
   *  Veidne does not apply. */
  format?: 'date' | 'number';
}

export interface FieldFinding {
  family: FieldFamily;
  name: string;
  occurrences: FieldOccurrence[];
}

export interface ControlFinding {
  family: ControlFamily;
  /** The keyword or tag, e.g. "#each rows", "/each", "for item in items", "IF". */
  tag: string;
  part: string;
  paragraph: number;
  raw: string;
  /** Field names used inside the block, or inside a Word IF/NEXTIF/SKIPIF code. */
  references?: string[];
}

/** A match that looked like a placeholder but was dropped, and why. Kept for
 *  diagnostics and tests; never shown to users. */
export interface RejectedMatch {
  family: FieldFamily;
  raw: string;
  part: string;
  reason: string;
}

export interface DetectionResult {
  fields: FieldFinding[];
  controls: ControlFinding[];
  rejected: RejectedMatch[];
  /** Parts that were read, in order. */
  parts: string[];
  /** Set when one loop encloses the entire body with nothing outside it,
   *  which is what Veidne does anyway: one document per row. */
  wholeBodyLoop: { open: ControlFinding; close: ControlFinding } | null;
}

// ── Parts ───────────────────────────────────────────────────────────────────

/**
 * The body, then every header and footer part. Relationships are the real
 * source; the name scan catches packages whose rels are missing or odd.
 * Regex only, no DOM, so the generator can call it outside a browser.
 */
export function listMergeParts(zip: PizZip): string[] {
  const parts = new Set<string>();
  if (zip.file(BODY_PART)) parts.add(BODY_PART);

  const rels = zip.file('word/_rels/document.xml.rels');
  if (rels) {
    const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '';
    for (const [tag] of rels.asText().matchAll(/<Relationship\b[^>]*>/g)) {
      const type = attr(tag, 'Type');
      if (type !== REL_HEADER && type !== REL_FOOTER) continue;
      if (attr(tag, 'TargetMode') === 'External') continue;
      const target = attr(tag, 'Target');
      const path = target.startsWith('/') ? target.slice(1) : `word/${target.replace(/^\.\//, '')}`;
      if (zip.file(path)) parts.add(path);
    }
  }

  const byName = Object.keys(zip.files)
    .filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  for (const n of byName) parts.add(n);

  return [...parts];
}

export function partKind(part: string): 'body' | 'header' | 'footer' {
  if (part === BODY_PART) return 'body';
  return /footer/.test(part) ? 'footer' : 'header';
}

// ── Word field codes ────────────────────────────────────────────────────────

const WORD_CONTROL_FIELDS = new Set(['IF', 'NEXT', 'NEXTIF', 'SKIPIF', 'MERGEREC', 'MERGESEQ']);

export interface MergeFieldInstruction {
  name: string;
  /** \b text, written before the value. */
  before: string;
  /** \f text, written after the value. */
  after: string;
  /** \@ date format present. */
  date: boolean;
  /** \# number format present. */
  number: boolean;
}

/**
 * A MERGEFIELD instruction: the field name, quoted ("First Name") or bare
 * (First_Name), and its switches. \b and \f text is kept so the import can
 * write it as literal text; \@ and \# are reported; \* MERGEFORMAT, case
 * switches, \m and \v are dropped. Returns null for anything that is not a
 * MERGEFIELD or has no name.
 */
export function parseMergeField(instr: string): MergeFieldInstruction | null {
  const m = instr.match(/^\s*MERGEFIELD\b\s*/i);
  if (!m) return null;
  let rest = instr.slice(m[0].length);
  let name: string;
  if (rest.startsWith('"')) {
    const close = rest.indexOf('"', 1);
    name = close > 0 ? rest.slice(1, close) : rest.slice(1);
    rest = close > 0 ? rest.slice(close + 1) : '';
  } else {
    // A bare name runs to the first space or switch backslash.
    name = rest.split(/[\s\\]/, 1)[0];
    rest = rest.slice(name.length);
  }
  name = name.trim();
  if (!name) return null;

  const out: MergeFieldInstruction = { name, before: '', after: '', date: false, number: false };
  // A switch argument is a quoted string or a bare word; it never starts
  // with a backslash, so "\m \* MERGEFORMAT" does not read "\*" as \m's.
  // Quoted text is kept exactly as written, leading and trailing spaces and
  // punctuation included; Word's \" and \\ escapes inside it are undone.
  for (const s of rest.matchAll(/\\([*@#bfmv])(?:\s*(?:"((?:[^"\\]|\\.)*)"|([^\s\\"]+)))?/gi)) {
    const arg = s[2] !== undefined ? s[2].replace(/\\(.)/g, '$1') : (s[3] ?? '');
    switch (s[1].toLowerCase()) {
      case 'b': out.before = arg; break;
      case 'f': out.after = arg; break;
      case '@': out.date = true; break;
      case '#': out.number = true; break;
    }
  }
  return out;
}

/** The field name of a MERGEFIELD instruction, or null. */
export function parseMergeFieldInstruction(instr: string): string | null {
  return parseMergeField(instr)?.name ?? null;
}

/** First keyword of a field instruction, upper-cased ("MERGEFIELD", "IF"). */
function fieldKeyword(instr: string): string {
  const m = instr.match(/^\s*([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : '';
}

// ── Text placeholder rules ──────────────────────────────────────────────────

/**
 * Whether the text inside a pair of delimiters reads like a field name rather
 * than prose, code or numbers. Each word must contain a letter and only
 * letters, digits, underscore, dot or hyphen; no sentence punctuation, quotes
 * or operators. `maxWords` is tighter for the families that collide with
 * ordinary writing.
 */
function nameShapeProblem(name: string, maxWords: number): string | null {
  if (!name) return 'empty';
  if (name.length > 40) return 'too long';
  const words = name.split(/\s+/);
  if (words.length > maxWords) return `more than ${maxWords} words`;
  for (const w of words) {
    if (!/^[\p{L}\p{N}_.-]+$/u.test(w)) return 'punctuation or symbols';
    if (!/\p{L}/u.test(w)) return 'a word with no letters';
  }
  if (!/^[\p{L}_]/u.test(name)) return 'does not start with a letter';
  return null;
}

/** The two families that collide with prose: at most three words and at
 *  least two characters, so "{ x }" in a formula is not a field. */
function lowConfidenceProblem(name: string): string | null {
  if (name.length < 2) return 'shorter than two characters';
  return nameShapeProblem(name, 3);
}

interface TextMatch {
  start: number;
  end: number;
  raw: string;
  inner: string;
}

function matchesOf(text: string, re: RegExp): TextMatch[] {
  const out: TextMatch[] = [];
  for (const m of text.matchAll(re)) {
    out.push({ start: m.index!, end: m.index! + m[0].length, raw: m[0], inner: m[1] ?? '' });
  }
  return out;
}

/** Replace the matched spans with spaces of the same length so later, looser
 *  patterns cannot match inside them, and offsets stay valid. */
function blank(text: string, spans: TextMatch[]): string {
  let s = text;
  for (const { start, end } of spans) s = s.slice(0, start) + ' '.repeat(end - start) + s.slice(end);
  return s;
}

/** Whether a control tag opens a block, closes one, or neither (else,
 *  comments, partials, Word's record-flow fields). */
type BlockEffect = 'open' | 'close' | 'none';

const JINJA_BLOCKS = /^(for|if|macro|block|with|filter|call|raw|autoescape|unless|case|capture|tablerow|comment)\b/;

function jinjaEffect(tag: string): BlockEffect {
  if (/^end/.test(tag)) return 'close';
  return JINJA_BLOCKS.test(tag) ? 'open' : 'none';
}

/** A loop, as opposed to a condition: the only block the whole-body
 *  exception applies to. docxtemplater's {#x} is either; it is a loop when x
 *  is a list, so it counts. */
function isLoopTag(c: ControlFinding): boolean {
  if (c.family === 'handlebars') return /^#\s*each\b/.test(c.tag);
  if (c.family === 'jinja') return /^for\b/.test(c.tag);
  if (c.family === 'docxtemplater') return c.tag.startsWith('#');
  return false;
}

/** A typed match found in a paragraph's text, before its family decided
 *  whether it is a field or a control. */
type TextHit =
  | { start: number; end: number; raw: string; kind: 'field'; family: FieldFamily; name: string }
  | { start: number; end: number; raw: string; kind: 'control'; family: ControlFamily; tag: string; effect: BlockEffect };

/** Scan one paragraph's visible text for every text family, tightest first,
 *  blanking each family's matches before the looser ones run. Rejections go
 *  straight to `reject`; fields and controls come back in reading order. */
function scanParagraphText(text: string, reject: (r: Omit<RejectedMatch, 'part'>) => void): TextHit[] {
  const hits: TextHit[] = [];
  if (!/[{}<>%«»$]/.test(text)) return hits;
  let s = text;
  const field = (family: FieldFamily, name: string, m: { start: number; end: number; raw: string }) =>
    hits.push({ ...m, kind: 'field', family, name });
  const control = (family: ControlFamily, tag: string, m: { start: number; end: number; raw: string }, effect: BlockEffect) =>
    hits.push({ ...m, kind: 'control', family, tag, effect });

  // {% ... %}: Jinja / Nunjucks / Liquid statements are always control.
  const jinja = matchesOf(s, /\{%-?\s*([\s\S]*?)\s*-?%\}/g);
  for (const m of jinja) control('jinja', m.inner.trim(), m, jinjaEffect(m.inner.trim()));
  s = blank(s, jinja);

  // {{ ... }}: Handlebars / Mustache. A leading # / ^ > ! or a bare "else"
  // is a control tag.
  const dbl = matchesOf(s, /\{\{\s*([^{}]*?)\s*\}\}/g);
  for (const m of dbl) {
    const inner = m.inner.trim();
    if (/^[#/^>!]/.test(inner) || /^else\b/i.test(inner)) {
      control('handlebars', inner, m, /^[#^]/.test(inner) ? 'open' : inner.startsWith('/') ? 'close' : 'none');
      continue;
    }
    const problem = nameShapeProblem(inner, 6);
    if (problem) reject({ family: 'doubleBrace', raw: m.raw, reason: problem });
    else field('doubleBrace', inner, m);
  }
  s = blank(s, dbl);

  // ${Name}, << Name >>, «Name»: low collision with prose.
  const simple: [FieldFamily, RegExp][] = [
    ['dollarBrace', /\$\{\s*([^{}]*?)\s*\}/g],
    ['chevron', /<<\s*([^<>]*?)\s*>>/g],
    ['guillemet', /«\s*([^«»]*?)\s*»/g],
  ];
  for (const [family, re] of simple) {
    const found = matchesOf(s, re);
    for (const m of found) {
      const problem = nameShapeProblem(m.inner.trim(), 6);
      if (problem) reject({ family, raw: m.raw, reason: problem });
      else field(family, m.inner.trim(), m);
    }
    s = blank(s, found);
  }

  // { Name }: docxtemplater's default syntax. # / ^ open a loop or
  // condition, / closes one. Otherwise only tight, name-shaped content counts.
  const single = matchesOf(s, /\{\s*([^{}]*?)\s*\}/g);
  for (const m of single) {
    const inner = m.inner.trim();
    if (/^[#/^](\s*[\p{L}_]|$)/u.test(inner)) {
      control('docxtemplater', inner, m, inner.startsWith('/') ? 'close' : 'open');
      continue;
    }
    const problem = lowConfidenceProblem(inner);
    if (problem) reject({ family: 'singleBrace', raw: m.raw, reason: problem });
    else field('singleBrace', inner, m);
  }
  s = blank(s, single);

  // % Name %: pair the percent signs left to right. An opening % that
  // follows a number ("5% of ... 10%") is a percentage, not a delimiter, so
  // it is skipped and the next % is tried as the opener; the content must be
  // name-shaped, which rejects number-only words.
  const pcts = [...s.matchAll(/%/g)].map((m) => m.index!);
  let i = 0;
  while (i < pcts.length - 1) {
    const open = pcts[i];
    const close = pcts[i + 1];
    if (/[\d.,]\s*$/.test(s.slice(0, open))) { i += 1; continue; }
    const raw = s.slice(open, close + 1);
    const inner = s.slice(open + 1, close).trim();
    if (inner.includes('\n')) { i += 1; continue; }
    const problem = lowConfidenceProblem(inner);
    if (problem) {
      reject({ family: 'percent', raw, reason: problem });
      i += 1;
    } else {
      field('percent', inner, { start: open, end: close + 1, raw });
      i += 2;
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

// ── Locators ────────────────────────────────────────────────────────────────

/** Characters [from, to) of one <w:t> element's text. */
export interface TextSpan { node: Element; from: number; to: number }

export type Locator =
  /** A typed placeholder: the <w:t> spans its characters occupy. */
  | { kind: 'text'; spans: TextSpan[] }
  /** A field code: the sibling elements from its begin run to its end run
   *  (or the one w:fldSimple), and the formatting of its displayed result. */
  | { kind: 'field'; nodes: Element[]; rPr: Element | null };

export interface LocatedField {
  family: FieldFamily;
  name: string;
  occurrence: FieldOccurrence;
  loc: Locator | null;
  /** MERGEFIELD \b / \f text. */
  before?: string;
  after?: string;
}

export interface LocatedControl {
  control: ControlFinding;
  loc: Locator | null;
}

export interface LocatedPart {
  part: string;
  doc: Document;
  fields: LocatedField[];
  controls: LocatedControl[];
  wholeBodyLoop: { open: LocatedControl; close: LocatedControl } | null;
}

// ── XML walk ────────────────────────────────────────────────────────────────

function ln(el: Element): string {
  return el.localName || el.nodeName.replace(/^[\w]+:/, '');
}

function wAttr(el: Element, name: string): string | null {
  const v = el.getAttributeNS(W_NS, name);
  if (v !== null && v !== '') return v;
  return el.getAttribute(`w:${name}`);
}

function childNamed(el: Element, name: string): Element | null {
  for (const ch of Array.from(el.children)) if (ln(ch) === name) return ch;
  return null;
}

/** A paragraph being read: its visible text, which <w:t> holds which part of
 *  that text, where drawings sit, and the field-code findings queued on it. */
interface ParaBuffer {
  index: number;
  text: string;
  segs: { node: Element; start: number; len: number }[];
  drawings: number[];
  queued: QueuedEvent[];
  flushed: boolean;
}

/** A finding replayed in reading order: typed hits have a width in the
 *  paragraph text, field codes have none. */
type QueuedEvent =
  | { offset: number; width: number; kind: 'field'; field: LocatedField }
  | { offset: number; width: number; kind: 'control'; control: LocatedControl; effect: BlockEffect };

/** A Word field being read: its instruction so far, whether the walk is in
 *  the code or the displayed result, and the fields nested in its code. */
interface OpenField {
  instr: string;
  phase: 'code' | 'result';
  /** Set once the instruction is complete (at separate, end, or at once for
   *  w:fldSimple). */
  kind: 'merge' | 'control' | 'other' | null;
  nested: { name: string; instr: string; parsed: MergeFieldInstruction }[];
  paragraph: number;
  para: ParaBuffer | null;
  offset: number;
  /** The run holding fldChar begin, or the w:fldSimple element. */
  first: Element | null;
}

function spansFor(buf: ParaBuffer, start: number, end: number): TextSpan[] {
  const out: TextSpan[] = [];
  for (const seg of buf.segs) {
    const a = Math.max(start, seg.start);
    const b = Math.min(end, seg.start + seg.len);
    if (a < b) out.push({ node: seg.node, from: a - seg.start, to: b - seg.start });
  }
  return out;
}

/** The sibling elements from `first` to `last` inclusive, or null when they
 *  do not share a parent (a field that spans paragraphs). */
function siblingRange(first: Element, last: Element): Element[] | null {
  if (first.parentNode !== last.parentNode) return null;
  const out: Element[] = [];
  for (let el: Element | null = first; el; el = el.nextElementSibling) {
    out.push(el);
    if (el === last) return out;
  }
  return null;
}

/** Formatting of a field's displayed result: the rPr of the first run after
 *  fldChar separate that holds text. */
function resultRPr(nodes: Element[]): Element | null {
  let afterSeparate = false;
  for (const r of nodes) {
    const fc = childNamed(r, 'fldChar');
    if (fc && wAttr(fc, 'fldCharType') === 'separate') { afterSeparate = true; continue; }
    if (ln(r) === 'fldSimple') {
      for (const sub of Array.from(r.children)) if (ln(sub) === 'r' && childNamed(sub, 't')) return childNamed(sub, 'rPr');
      return null;
    }
    if (afterSeparate && ln(r) === 'r' && childNamed(r, 't')) return childNamed(r, 'rPr');
  }
  return null;
}

/** Walk one part and report everything in it, with locators. */
export function scanPartDocument(doc: Document, part: string, reject: (r: RejectedMatch) => void): LocatedPart {
  const out: LocatedPart = { part, doc, fields: [], controls: [], wholeBodyLoop: null };
  const isBody = part === BODY_PART;

  const fields: OpenField[] = [];
  // Paragraph text buffers; text boxes nest a paragraph inside another.
  const paraStack: ParaBuffer[] = [];
  let paraCounter = 0;
  const currentPara = () => paraStack[paraStack.length - 1] ?? null;

  // Blocks opened by a loop or condition and not yet closed. A field found
  // while one is open belongs to the repeating section, not to the document:
  // it is listed on the block's control finding, not offered as a field.
  const blocks: LocatedControl[] = [];
  // Whole-body loop tracking (body only): the blocks opened at depth 0,
  // where each one closed, and whether anything sits outside every block.
  const topLevel: { open: LocatedControl; close: LocatedControl | null }[] = [];
  let outside = false;

  const replay = (e: QueuedEvent) => {
    if (e.kind === 'control') {
      out.controls.push(e.control);
      if (e.effect === 'open') {
        if (blocks.length === 0) topLevel.push({ open: e.control, close: null });
        blocks.push(e.control);
      } else if (e.effect === 'close') {
        blocks.pop();
        if (blocks.length === 0 && topLevel.length > 0 && !topLevel[topLevel.length - 1].close) {
          topLevel[topLevel.length - 1].close = e.control;
        }
      } else if (blocks.length === 0) {
        outside = true;
      }
      return;
    }
    const open = blocks[blocks.length - 1];
    if (open) {
      const refs = (open.control.references ??= []);
      if (!refs.includes(e.field.name)) refs.push(e.field.name);
      return;
    }
    outside = true;
    out.fields.push(e.field);
  };

  /** Queue a field-code event on the paragraph it began in, or replay it now
   *  when that paragraph is already done (a field spanning paragraphs). */
  const emit = (f: OpenField, e: QueuedEvent) => {
    if (f.para && !f.para.flushed) f.para.queued.push(e);
    else replay(e);
  };

  /** Text is visible, and belongs to the scan, unless it sits in a field's
   *  code, or in the displayed result of a merge or control field (Word shows
   *  «Name» there, which is the field itself, not typed text). */
  const textVisible = () => fields.every((f) => f.phase === 'result' && f.kind === 'other');

  const classify = (f: OpenField) => {
    if (f.kind) return;
    const kw = fieldKeyword(f.instr);
    f.kind = kw === 'MERGEFIELD' ? 'merge' : WORD_CONTROL_FIELDS.has(kw) ? 'control' : 'other';
  };

  /** A field is complete. Report it, or hand its findings to the field it is
   *  nested in, so a MERGEFIELD inside an IF is reported as part of the IF. */
  const close = (f: OpenField, last: Element | null) => {
    classify(f);
    const parent = fields[fields.length - 1];
    const nodes = f.first && last ? siblingRange(f.first, last) : null;
    if (f.kind === 'control') {
      const control: ControlFinding = {
        family: 'wordField', tag: fieldKeyword(f.instr), part, paragraph: f.paragraph,
        raw: f.instr.trim().replace(/\s+/g, ' '),
        references: [...new Set(f.nested.map((n) => n.name))],
      };
      const located: LocatedControl = { control, loc: nodes ? { kind: 'field', nodes, rPr: null } : null };
      // A Word IF nested in another field's code is part of that field.
      if (parent && parent.phase === 'code') return;
      emit(f, { offset: f.offset, width: 0, kind: 'control', control: located, effect: 'none' });
      return;
    }
    const own = f.kind === 'merge' ? parseMergeField(f.instr) : null;
    if (parent && parent.phase === 'code') {
      parent.nested.push(...f.nested);
      if (own) parent.nested.push({ name: own.name, instr: f.instr, parsed: own });
      return;
    }
    // A MERGEFIELD nested inside a non-control field's code (rare) cannot be
    // replaced on its own; it is reported without a locator.
    for (const n of f.nested) {
      emit(f, { offset: f.offset, width: 0, kind: 'field', field: mergeFinding(n.name, n.instr, n.parsed, f.paragraph, null) });
    }
    if (own) {
      const loc: Locator | null = nodes ? { kind: 'field', nodes, rPr: resultRPr(nodes) } : null;
      emit(f, { offset: f.offset, width: 0, kind: 'field', field: mergeFinding(own.name, f.instr, own, f.paragraph, loc) });
    }
  };

  const mergeFinding = (name: string, instr: string, parsed: MergeFieldInstruction, paragraph: number, loc: Locator | null): LocatedField => ({
    family: 'mergefield', name, loc, before: parsed.before, after: parsed.after,
    occurrence: {
      part, paragraph, raw: instr.trim().replace(/\s+/g, ' '),
      ...(parsed.date ? { format: 'date' as const } : parsed.number ? { format: 'number' as const } : {}),
    },
  });

  const openField = (instr: string, phase: OpenField['phase'], first: Element | null): OpenField => {
    const para = currentPara();
    return { instr, phase, kind: null, nested: [], paragraph: para?.index ?? -1, para, offset: para?.text.length ?? 0, first };
  };

  const flush = (buf: ParaBuffer) => {
    const typed: QueuedEvent[] = scanParagraphText(buf.text, (r) => reject({ ...r, part })).map((h) => {
      const loc: Locator = { kind: 'text', spans: spansFor(buf, h.start, h.end) };
      if (h.kind === 'field') {
        const occurrence: FieldOccurrence = { part, paragraph: buf.index, raw: h.raw };
        if (h.family === 'doubleBrace' && h.raw === `{{${h.name}}}`) occurrence.canonical = true;
        return { offset: h.start, width: h.end - h.start, kind: 'field' as const, field: { family: h.family, name: h.name, occurrence, loc } };
      }
      const control: ControlFinding = { family: h.family, tag: h.tag, part, paragraph: buf.index, raw: h.raw };
      return { offset: h.start, width: h.end - h.start, kind: 'control' as const, control: { control, loc }, effect: h.effect };
    });
    // Stable sort: a field code and a typed tag at the same offset keep
    // field-code-first order.
    const all = [...buf.queued, ...typed].sort((a, b) => a.offset - b.offset);
    buf.flushed = true;
    const contentIn = (from: number, to: number) =>
      /\S/.test(buf.text.slice(from, to)) || buf.drawings.some((d) => d >= from && d < to);
    let cursor = 0;
    for (const e of all) {
      if (blocks.length === 0 && contentIn(cursor, e.offset)) outside = true;
      replay(e);
      cursor = Math.max(cursor, e.offset + e.width);
    }
    if (blocks.length === 0 && contentIn(cursor, buf.text.length + 1)) outside = true;
  };

  const walk = (el: Element) => {
    const n = ln(el);
    switch (n) {
      case 'p': {
        const buf: ParaBuffer = { index: paraCounter++, text: '', segs: [], drawings: [], queued: [], flushed: false };
        paraStack.push(buf);
        for (const ch of Array.from(el.children)) walk(ch);
        paraStack.pop();
        flush(buf);
        return;
      }
      case 'fldSimple': {
        const f = openField(wAttr(el, 'instr') || '', 'result', el);
        classify(f);
        fields.push(f);
        for (const ch of Array.from(el.children)) walk(ch);
        fields.pop();
        close(f, el);
        return;
      }
      case 'fldChar': {
        const type = wAttr(el, 'fldCharType');
        const run = el.parentElement;
        if (type === 'begin') {
          fields.push(openField('', 'code', run));
        } else if (type === 'separate') {
          const f = fields[fields.length - 1];
          if (f) { f.phase = 'result'; classify(f); }
        } else if (type === 'end') {
          const f = fields.pop();
          if (f) close(f, run);
        }
        return;
      }
      case 'instrText': {
        const f = fields[fields.length - 1];
        if (f && f.phase === 'code') f.instr += el.textContent || '';
        return;
      }
      case 't': {
        const p = currentPara();
        if (p && textVisible()) {
          const text = el.textContent || '';
          p.segs.push({ node: el, start: p.text.length, len: text.length });
          p.text += text;
        }
        return;
      }
      case 'tab': {
        const p = currentPara();
        if (p && textVisible()) p.text += '\t';
        return;
      }
      case 'br':
      case 'cr': {
        const p = currentPara();
        if (p && textVisible()) p.text += '\n';
        return;
      }
      case 'drawing':
      case 'pict':
      case 'object': {
        const p = currentPara();
        if (p && textVisible()) p.drawings.push(p.text.length);
        for (const ch of Array.from(el.children)) walk(ch);
        return;
      }
      // Deleted revisions are not in the document the user sees.
      case 'del':
      case 'delText':
      case 'delInstrText':
      case 'moveFrom':
        return;
      default:
        for (const ch of Array.from(el.children)) walk(ch);
    }
  };

  walk(doc.documentElement);

  if (isBody && !outside && topLevel.length === 1 && topLevel[0].close && isLoopTag(topLevel[0].open.control)) {
    out.wholeBodyLoop = { open: topLevel[0].open, close: topLevel[0].close };
  }
  return out;
}

// ── Package scan ────────────────────────────────────────────────────────────

export interface LocatedPackage {
  parts: LocatedPart[];
  rejected: RejectedMatch[];
}

/** Parse and scan every merge part, keeping the parsed documents so a caller
 *  can edit them through the locators and serialize them back. */
export function scanPackage(zip: PizZip): LocatedPackage {
  const rejected: RejectedMatch[] = [];
  const parts: LocatedPart[] = [];
  for (const part of listMergeParts(zip)) {
    const file = zip.file(part);
    if (!file) continue;
    const doc = new DOMParser().parseFromString(file.asText(), 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) continue;
    parts.push(scanPartDocument(doc, part, (r) => rejected.push(r)));
  }
  return { parts, rejected };
}

/**
 * A document templated with { Name } or % Name % uses its delimiters for
 * little else, so nearly every pair it holds is name-shaped. Prose and code
 * that happen to contain braces or percent signs mostly do not. A
 * low-confidence family is offered only when its name-shaped pairs are at
 * least as many as the pairs that were rejected, so a page of JSON or
 * formulas does not turn its two stray word-in-braces into fields.
 */
export function suppressedFamilies(fields: { family: FieldFamily }[], rejected: RejectedMatch[]): Set<FieldFamily> {
  const out = new Set<FieldFamily>();
  for (const family of LOW_CONFIDENCE_FAMILIES) {
    const offered = fields.filter((f) => f.family === family).length;
    const refused = rejected.filter((r) => r.family === family).length;
    if (offered > 0 && offered < refused) out.add(family);
  }
  return out;
}

export function detectPlaceholders(zip: PizZip): DetectionResult {
  const { parts, rejected } = scanPackage(zip);
  const located = parts.flatMap((p) => p.fields);
  const suppressed = suppressedFamilies(located, rejected);

  const byKey = new Map<string, FieldFinding>();
  for (const f of located) {
    if (suppressed.has(f.family)) {
      rejected.push({ family: f.family, raw: f.occurrence.raw, part: f.occurrence.part, reason: 'fewer name-shaped pairs than other pairs in this document' });
      continue;
    }
    const key = `${f.family}\u0000${f.name}`;
    let finding = byKey.get(key);
    if (!finding) { finding = { family: f.family, name: f.name, occurrences: [] }; byKey.set(key, finding); }
    finding.occurrences.push(f.occurrence);
  }

  const body = parts.find((p) => p.part === BODY_PART);
  return {
    fields: [...byKey.values()],
    controls: parts.flatMap((p) => p.controls.map((c) => c.control)),
    rejected,
    parts: parts.map((p) => p.part),
    wholeBodyLoop: body?.wholeBodyLoop ? { open: body.wholeBodyLoop.open.control, close: body.wholeBodyLoop.close.control } : null,
  };
}
