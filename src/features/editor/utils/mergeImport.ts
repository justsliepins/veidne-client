import PizZip from 'pizzip';
import {
  BODY_PART, LOW_CONFIDENCE_FAMILIES, partKind, scanPackage, suppressedFamilies,
  type ControlFinding, type FieldFamily, type LocatedControl, type LocatedField, type LocatedPart, type TextSpan,
} from './placeholderDetector';

/**
 * Importing placeholders from another mail merge tool.
 *
 * Exact {{Name}} is Veidne's own syntax (it is what "Save template" writes),
 * so it becomes a field on upload with no question asked, in the body as it
 * always has and in headers and footers too. Everything else the detector finds is offered to the user
 * first, and nothing in the document changes until they confirm. On confirm,
 * each chosen occurrence is rewritten to a single {{Name}} run in place
 * (body, headers and footers alike), and the document is then loaded the way
 * a Veidne template is: the body fields become ordinary fields on their
 * tokens, the header and footer ones are carried on the field as
 * outsideBody. Every later step (preview, mapping, tagging, generation,
 * rename, delete) is the one a hand-made field goes through.
 */

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';

export type PartKind = 'body' | 'header' | 'footer';

/** One row of the confirm step: a field name in one syntax family. */
export interface ImportCandidate {
  key: string;
  family: FieldFamily;
  name: string;
  occurrences: number;
  /** Where its occurrences are, in body, header, footer order. */
  parts: PartKind[];
  /** Date or number formatting a Word MERGEFIELD asked for. */
  formats: ('date' | 'number')[];
  /** Ticked when the step opens. */
  preselected: boolean;
  /** The syntax as it is written in the file, with the field name shown as
   *  Name: "{{ Name }}", "<< Name >>", "{Name}". Empty for Word fields. */
  shapes: string[];
}

export interface ImportAnalysis {
  /** Fields that become Veidne fields without a question: exact {{Name}},
   *  Veidne's own form, in the body, a header or a footer, outside any loop. */
  autoNames: string[];
  candidates: ImportCandidate[];
  controls: ControlFinding[];
  /** The tags of a loop that encloses the whole body, when there is one. */
  wholeBodyLoop: { open: string; close: string } | null;
}

/** Families ticked by default. { } and % % are left for the user to opt into:
 *  they are the ones ordinary prose produces. */
export function preselectedFamily(family: FieldFamily): boolean {
  return !LOW_CONFIDENCE_FAMILIES.has(family);
}

export function candidateKey(family: FieldFamily, name: string): string {
  return `${family}:${name}`;
}

/** Canonical {{Name}} in a header or footer, counted per name. Fields carry
 *  these as outsideBody, since the editor shows the body only. */
export type OutsideBody = Map<string, { count: number; parts: PartKind[] }>;

interface Scan {
  zip: PizZip;
  parts: LocatedPart[];
  /** Located fields the user may see, low-confidence families suppressed. */
  fields: LocatedField[];
}

function scan(bytes: ArrayBuffer): Scan {
  const zip = new PizZip(bytes);
  const { parts, rejected } = scanPackage(zip);
  const all = parts.flatMap((p) => p.fields);
  const suppressed = suppressedFamilies(all, rejected);
  return { zip, parts, fields: all.filter((f) => !suppressed.has(f.family)) };
}

// Exact {{Name}} is the form Veidne writes, so it is applied without a
// question wherever it is: a template saved from Veidne with fields in its
// header comes back with them, and the step is left for foreign syntax.
const isCanonical = (f: LocatedField) => f.occurrence.canonical === true;

/** "{{ Customer }}" -> "{{ Name }}": the delimiters and spacing as written. */
function shapeOf(f: LocatedField): string | null {
  if (f.family === 'mergefield') return null;
  const raw = f.occurrence.raw.replace(/\s+/g, ' ');
  const at = raw.indexOf(f.name);
  return at < 0 ? null : raw.slice(0, at) + 'Name' + raw.slice(at + f.name.length);
}

const PART_ORDER: PartKind[] = ['body', 'header', 'footer'];

export function analyzeTemplate(bytes: ArrayBuffer): ImportAnalysis {
  const { parts, fields } = scan(bytes);
  const autoNames = [...new Set(fields.filter(isCanonical).map((f) => f.name))];

  const rows = new Map<string, ImportCandidate>();
  for (const f of fields) {
    if (isCanonical(f)) continue;
    // A finding with no locator cannot be rewritten, so it is not offered.
    if (!f.loc) continue;
    const key = candidateKey(f.family, f.name);
    let row = rows.get(key);
    if (!row) {
      row = { key, family: f.family, name: f.name, occurrences: 0, parts: [], formats: [], preselected: preselectedFamily(f.family), shapes: [] };
      rows.set(key, row);
    }
    row.occurrences++;
    const kind = partKind(f.occurrence.part);
    if (!row.parts.includes(kind)) row.parts.push(kind);
    if (f.occurrence.format && !row.formats.includes(f.occurrence.format)) row.formats.push(f.occurrence.format);
    const shape = shapeOf(f);
    if (shape && !row.shapes.includes(shape)) row.shapes.push(shape);
  }
  for (const row of rows.values()) row.parts.sort((a, b) => PART_ORDER.indexOf(a) - PART_ORDER.indexOf(b));

  const body = parts.find((p) => p.part === BODY_PART);
  return {
    autoNames,
    candidates: [...rows.values()],
    controls: parts.flatMap((p) => p.controls.map((c) => c.control)),
    wholeBodyLoop: body?.wholeBodyLoop
      ? { open: body.wholeBodyLoop.open.control.raw, close: body.wholeBodyLoop.close.control.raw }
      : null,
  };
}

/** Canonical {{Name}} occurrences outside the body, for the given names. */
export function outsideBodyFields(bytes: ArrayBuffer, names: Iterable<string>): OutsideBody {
  const wanted = new Set(names);
  const out: OutsideBody = new Map();
  for (const f of scan(bytes).fields) {
    if (!f.occurrence.canonical || f.occurrence.part === BODY_PART || !wanted.has(f.name)) continue;
    const entry = out.get(f.name) ?? { count: 0, parts: [] };
    entry.count++;
    const kind = partKind(f.occurrence.part);
    if (!entry.parts.includes(kind)) entry.parts.push(kind);
    out.set(f.name, entry);
  }
  return out;
}

// ── Rewriting ───────────────────────────────────────────────────────────────

interface NodeEdit { from: number; to: number; insert: string }

/** Replace a typed match's characters with `insert`, written into the first
 *  <w:t> the match touches; its other characters are deleted. */
function planText(spans: TextSpan[], insert: string, edits: Map<Element, NodeEdit[]>): void {
  spans.forEach((s, i) => {
    const list = edits.get(s.node) ?? [];
    list.push({ from: s.from, to: s.to, insert: i === 0 ? insert : '' });
    edits.set(s.node, list);
  });
}

function applyTextEdits(edits: Map<Element, NodeEdit[]>): void {
  for (const [node, list] of edits) {
    list.sort((a, b) => b.from - a.from);
    let text = node.textContent || '';
    for (const e of list) text = text.slice(0, e.from) + e.insert + text.slice(e.to);
    node.textContent = text;
    if (/^\s|\s$/.test(text)) node.setAttributeNS(XML_NS, 'xml:space', 'preserve');
  }
}

/** Replace a field code with one run holding `text`, in the formatting of
 *  the field's displayed result. */
function replaceField(doc: Document, nodes: Element[], rPr: Element | null, text: string): void {
  const first = nodes[0];
  const parent = first.parentNode;
  if (!parent) return;
  const run = doc.createElementNS(W_NS, 'w:r');
  if (rPr) run.appendChild(rPr.cloneNode(true));
  const t = doc.createElementNS(W_NS, 'w:t');
  t.setAttributeNS(XML_NS, 'xml:space', 'preserve');
  t.textContent = text;
  run.appendChild(t);
  parent.insertBefore(run, first);
  for (const n of nodes) if (n.parentNode === parent) parent.removeChild(n);
}

function serialize(doc: Document, original: string): string {
  let out = new XMLSerializer().serializeToString(doc);
  if (!out.startsWith('<?xml')) {
    const decl = original.match(/^<\?xml[^>]*\?>\s*/);
    if (decl) out = decl[0] + out;
  }
  return out;
}

function writeBack(s: Scan, changed: Set<LocatedPart>): ArrayBuffer {
  for (const p of changed) {
    const original = s.zip.file(p.part)!.asText();
    const xml = serialize(p.doc, original);
    // A part that no longer parses must never ship.
    if (new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('parsererror').length > 0) {
      throw new Error(`merge import produced invalid XML in ${p.part}`);
    }
    s.zip.file(p.part, xml);
  }
  return s.zip.generate({ type: 'arraybuffer', compression: 'DEFLATE' }) as ArrayBuffer;
}

/**
 * Join exact {{Name}} tags in headers and footers that Word split over several
 * runs (an edit, a spell-check mark or an rsid inside the tag) into one run,
 * so a rename can rewrite them there (renameOutsideBodyTags reads one <w:t>).
 * The text does not change, and the body is left alone: its fields sit on the
 * editor's tokens. Returns null when nothing was split.
 */
export function joinSplitOutsideBodyTags(bytes: ArrayBuffer): ArrayBuffer | null {
  const s = scan(bytes);
  const changed = new Set<LocatedPart>();
  for (const p of s.parts) {
    if (p.part === BODY_PART) continue;
    const edits = new Map<Element, NodeEdit[]>();
    for (const f of p.fields) {
      if (!f.occurrence.canonical || f.loc?.kind !== 'text' || f.loc.spans.length < 2) continue;
      planText(f.loc.spans, `{{${f.name}}}`, edits);
      changed.add(p);
    }
    applyTextEdits(edits);
  }
  return changed.size > 0 ? writeBack(s, changed) : null;
}

/**
 * Rewrite every occurrence of the chosen candidates to {{Name}}. Typed
 * placeholders are replaced in their own text (the first run's formatting
 * stays); a MERGEFIELD code is replaced by one run holding its \b text,
 * {{Name}} and its \f text. Exact {{Name}} in the body is left alone (it is
 * already a field), and everything not chosen is left exactly as it was.
 */
export function applyImport(bytes: ArrayBuffer, keys: Iterable<string>): ArrayBuffer {
  const chosen = new Set(keys);
  const s = scan(bytes);
  const changed = new Set<LocatedPart>();
  for (const p of s.parts) {
    const edits = new Map<Element, NodeEdit[]>();
    const fieldCodes: LocatedField[] = [];
    for (const f of p.fields) {
      if (!f.loc || !chosen.has(candidateKey(f.family, f.name)) || (f.occurrence.canonical && f.occurrence.part === BODY_PART)) continue;
      if (f.loc.kind === 'text') {
        // Already exactly {{Name}} in one <w:t>: nothing to do.
        if (f.occurrence.canonical && f.loc.spans.length === 1) continue;
        planText(f.loc.spans, `{{${f.name}}}`, edits);
      } else {
        fieldCodes.push(f);
      }
      changed.add(p);
    }
    applyTextEdits(edits);
    for (const f of fieldCodes) {
      if (f.loc?.kind !== 'field') continue;
      replaceField(p.doc, f.loc.nodes, f.loc.rPr, `${f.before ?? ''}{{${f.name}}}${f.after ?? ''}`);
    }
  }
  return changed.size > 0 ? writeBack(s, changed) : bytes;
}

/** Whether a paragraph holds nothing a reader would see: no text, no
 *  drawing, no field, no section break. */
function paragraphIsEmpty(p: Element): boolean {
  if ((p.textContent ?? '').trim() !== '') return false;
  for (const name of ['drawing', 'pict', 'object', 'fldChar', 'fldSimple', 'sectPr', 'tbl']) {
    if (p.getElementsByTagNameNS(W_NS, name).length > 0) return false;
  }
  return true;
}

function enclosingParagraph(el: Element): Element | null {
  for (let n: Element | null = el; n; n = n.parentElement) {
    if ((n.localName || n.nodeName.replace(/^[\w]+:/, '')) === 'p') return n;
  }
  return null;
}

/**
 * Remove the two tags of a loop that encloses the entire body, keeping
 * everything between them. Only for a loop that wraps the whole body: there
 * it means exactly what Veidne does anyway, one document per row. A
 * paragraph left with nothing in it after its tag is removed is removed too,
 * unless it is the last one in a table cell. Returns null when the document
 * has no such loop.
 */
export function removeWholeBodyLoop(bytes: ArrayBuffer): ArrayBuffer | null {
  const s = scan(bytes);
  const body = s.parts.find((p) => p.part === BODY_PART);
  const loop = body?.wholeBodyLoop;
  if (!body || !loop) return null;
  const tags: LocatedControl[] = [loop.open, loop.close];
  if (tags.some((t) => t.loc?.kind !== 'text')) return null;

  const edits = new Map<Element, NodeEdit[]>();
  const paras = new Set<Element>();
  for (const tag of tags) {
    if (tag.loc?.kind !== 'text') continue;
    planText(tag.loc.spans, '', edits);
    for (const sp of tag.loc.spans) {
      const p = enclosingParagraph(sp.node);
      if (p) paras.add(p);
    }
  }
  applyTextEdits(edits);
  for (const p of paras) {
    if (!paragraphIsEmpty(p) || !p.parentNode) continue;
    const parent = p.parentNode as Element;
    const inCell = (parent.localName || '') === 'tc';
    const siblings = Array.from(parent.children).filter((c) => (c.localName || '') === 'p');
    if (inCell && siblings.length <= 1) continue;
    parent.removeChild(p);
  }
  return writeBack(s, new Set([body]));
}

// ── Header and footer tags at tagging time ──────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Header and footer occurrences of a field were written as {{tag}} when it
 * was imported. If the field has been renamed since, write its current name
 * there, as the body tagger does for body occurrences. String-level on
 * purpose: the import wrote each tag into a single <w:t>.
 */
export function renameOutsideBodyTags(xml: string, renames: { tag: string; name: string }[]): string {
  let out = xml;
  for (const { tag, name } of renames) {
    if (tag === name) continue;
    const pattern = new RegExp(escapeRegExp(`{{${escapeXml(tag)}}}`), 'g');
    const replacement = `{{${escapeXml(name)}}}`;
    out = out.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, (_, open, text, close) =>
      open + text.replace(pattern, () => replacement) + close);
  }
  return out;
}
