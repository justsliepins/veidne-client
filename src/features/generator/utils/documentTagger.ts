import PizZip from 'pizzip';
import type { Placeholder, WordToken } from '@/features/editor/utils/types';
import { listParagraphElements, listRunElements } from '@/features/editor/utils/docxAnchors';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function localName(el: Element): string {
  return el.localName || el.nodeName.replace(/^[\w]+:/, '');
}

/** Remove spell/grammar proof markers that cause Word to split text across runs.
 *  Also drops w:lastRenderedPageBreak: it is render metadata Word regenerates,
 *  the editor parser already ignores it, and leaving it in a text run would
 *  turn that run into a merge boundary and hide placeholders that span a
 *  rendered page break. */
function removeProofingMarks(xml: string): string {
  return xml
    .replace(/<w:proofErr[^>]*\/>/g, '')
    .replace(/<w:lastRenderedPageBreak\s*\/>/g, '');
}

/**
 * Merge adjacent <w:r> elements that share identical <w:rPr> formatting.
 * Word's spell-checker / editing history often splits a single word across
 * multiple runs even though the formatting is the same.  Merging them back
 * ensures that plain-text search-and-replace can find multi-character
 * placeholder names that were split.
 */
function mergeAdjacentRuns(xml: string): string {
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (para) => {
    type Piece =
      | { kind: 'text'; rPr: string; text: string }
      | { kind: 'raw'; xml: string };

    const pieces: Piece[] = [];
    const re = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(para)) !== null) {
      if (m.index > last) {
        pieces.push({ kind: 'raw', xml: para.slice(last, m.index) });
      }
      const body = m[1];
      const rPrM = body.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
      const rPr = rPrM ? rPrM[0] : '';
      const tM = body.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/);

      // A run is mergeable text only when its whole body is the rPr plus that
      // single w:t. Any other child (w:drawing, w:pict, w:br, w:tab, ...)
      // would be silently destroyed by the rPr+w:t rebuild below, so such a
      // run becomes a boundary: never merged into, preserved verbatim.
      // Merging still happens on both sides of it.
      let residue = body;
      if (rPr) residue = residue.replace(rPr, '');
      if (tM) residue = residue.replace(tM[0], '');

      if (tM && residue.trim() === '') {
        pieces.push({ kind: 'text', rPr, text: tM[1] });
      } else {
        pieces.push({ kind: 'raw', xml: m[0] });
      }
      last = m.index + m[0].length;
    }

    if (last < para.length) {
      pieces.push({ kind: 'raw', xml: para.slice(last) });
    }

    const merged: Piece[] = [];
    for (const p of pieces) {
      const prev = merged[merged.length - 1];
      if (p.kind === 'text' && prev?.kind === 'text' && prev.rPr === p.rPr) {
        prev.text += p.text;
      } else {
        merged.push(
          p.kind === 'text' ? { kind: 'text', rPr: p.rPr, text: p.text } : p,
        );
      }
    }

    return merged
      .map((p) => {
        if (p.kind === 'raw') return p.xml;
        const preserve = /^\s|\s$/.test(p.text) ? ' xml:space="preserve"' : '';
        return `<w:r>${p.rPr}<w:t${preserve}>${p.text}</w:t></w:r>`;
      })
      .join('');
  });
}

// ── Position-based tagging ───────────────────────────────────────────────────
//
// Each occurrence of a field is a contiguous token range, and each text token
// carries the anchors the parser assigned (paraDocIndex / runDocIndex /
// charOffset, see docxAnchors.ts). Tagging walks the same document with the
// same walkers, deletes the covered characters from the runs they live in,
// and writes one {{NAME}} into the run where the occurrence starts — so a
// field spanning runs with different formatting (bold + plain, inline code,
// split list-item runs) tags correctly, which plain text search cannot do.
//
// An occurrence may also span MULTIPLE paragraphs, including empty ones
// (blank lines). A Word tag cannot cross <w:p>, so such a span is
// collapsed-and-replaced: the covered text is deleted across every spanned
// paragraph, the single {{NAME}} lands at the span's start in the first
// (anchor) paragraph — which keeps its own pPr by design — any surviving
// tail text of the last paragraph moves into the anchor paragraph, and the
// emptied paragraph elements (empty ones included) are removed. Spanned
// empty paragraphs contribute zero covered text: their tokens are synthetic
// fillers (see WordToken.isEmptyParagraphFiller).
//
// Every occurrence is validated before any edit is committed: tokens must be
// word/space with anchors advancing in document order, the covered runs may
// contain nothing but text-safe children, spanned paragraphs must be
// siblings (no crossing table cells or content-control boundaries), and the
// exact characters being deleted must equal the text the tokens claim is
// there. A failed single-paragraph occurrence falls back to the legacy
// text-search pass; a failed multi-paragraph occurrence is refused outright
// with a warning (text search cannot match text glued across paragraphs) —
// a missed tag is recoverable, corrupted text is not.

interface Pos { para: number; run: number; off: number }

interface OccurrenceSpan {
  ph: Placeholder;
  start: Pos;
  /** Exclusive. */
  end: Pos;
  /** The exact characters the edit will delete, per the tokens. */
  covered: string;
}

function cmpPos(a: Pos, b: Pos): number {
  return a.para - b.para || a.run - b.run || a.off - b.off;
}

function isMultiPara(span: OccurrenceSpan): boolean {
  return span.end.para > span.start.para;
}

/** Children a covered run may contain besides its <w:t> text. Anything else
 *  (field chars, symbols, drawings, tracked-change wrappers…) means deleting
 *  the covered text could orphan invisible content, so the occurrence falls
 *  back to text search. tab/br/cr are safe to allow: had one sat INSIDE the
 *  covered range it would have produced a token and failed the token checks,
 *  so its presence here means it sits outside the range and stays untouched. */
const INERT_RUN_CHILDREN = new Set(['rPr', 't', 'lastRenderedPageBreak', 'tab', 'br', 'cr']);

/** Map one occurrence's token-ID range to a character span in anchor
 *  coordinates, or null when it cannot be placed positionally. */
function resolveOccurrence(
  ph: Placeholder, ids: string[], tokenById: Map<string, WordToken>,
): OccurrenceSpan | null {
  if (ids.length === 0) return null;
  const range: WordToken[] = [];
  for (const id of ids) {
    const t = tokenById.get(id);
    if (!t) return null;
    range.push(t);
  }

  let prevPara = -1;
  let prevRun = -1;
  let prevEnd = -1;
  for (const t of range) {
    if (t.type !== 'word' && t.type !== 'space') return null;
    // Empty-paragraph fillers are structural: they place the blank <w:p> in
    // document order (so the collapse can span and remove it) but have no
    // run, no offset, and no covered text.
    if (t.isEmptyParagraphFiller) {
      if (t.paraDocIndex === undefined || t.paraDocIndex < prevPara) return null;
      prevPara = t.paraDocIndex;
      prevRun = -1;
      prevEnd = -1;
      continue;
    }
    if (t.paraDocIndex === undefined || t.runDocIndex === undefined || t.charOffset === undefined) return null;
    // Tokens must advance in document order for the span to be contiguous.
    if (t.paraDocIndex < prevPara) return null;
    if (t.paraDocIndex === prevPara
      && (t.runDocIndex < prevRun || (t.runDocIndex === prevRun && t.charOffset < prevEnd))) return null;
    prevPara = t.paraDocIndex;
    prevRun = t.runDocIndex;
    prevEnd = t.charOffset + t.text.length;
  }

  // The marker replaces originalText only; punctuation glued to the range's
  // edges ("(Anna)," for field text "Anna") stays in the document, matching
  // how getSelectedText stripped it at field creation. Empty-paragraph
  // fillers drop out here exactly as getSelectedText dropped them from
  // originalText: their NBSP is display-only and exists nowhere in the XML.
  const textRange = range.filter((t) => !t.isEmptyParagraphFiller);
  if (textRange.length === 0) return null;
  const raw = textRange.map((t) => t.text).join('');
  let lead = ph.originalText ? raw.indexOf(ph.originalText) : -1;
  let covLen = ph.originalText.length;
  if (lead < 0) {
    // Other occurrences of the same words can differ in glued punctuation;
    // strip edges the same way getSelectedText does.
    lead = (raw.match(/^[^\p{L}\p{N}]*/u) as RegExpMatchArray)[0].length;
    covLen = raw.length - lead - (raw.match(/[^\p{L}\p{N}]*$/u) as RegExpMatchArray)[0].length;
  }
  if (covLen <= 0) return null;

  let start: Pos | null = null;
  let end: Pos | null = null;
  let cum = 0;
  for (const t of textRange) {
    const len = t.text.length;
    if (!start && lead < cum + len) {
      start = { para: t.paraDocIndex!, run: t.runDocIndex!, off: t.charOffset! + (lead - cum) };
    }
    if (!end && lead + covLen <= cum + len) {
      end = { para: t.paraDocIndex!, run: t.runDocIndex!, off: t.charOffset! + (lead + covLen - cum) };
    }
    cum += len;
  }
  if (!start || !end) return null;

  return { ph, start, end, covered: raw.slice(lead, lead + covLen) };
}

interface NodeEdit { from: number; to: number; insert?: string }

interface OccurrencePlan {
  edits: Map<Element, NodeEdit>;
  /** Multi-paragraph spans only: after all text splices, the tail
   *  paragraph's surviving children move into the anchor paragraph (which
   *  keeps its own pPr), then the emptied paragraph elements are removed. */
  collapse: { anchor: Element; tail: Element; remove: Element[] } | null;
}

/** Turn one occurrence span into per-<w:t> splice operations (all in
 *  pre-edit coordinates) plus, for multi-paragraph spans, the collapse ops.
 *  Returns null when the covered content contains anything the edit cannot
 *  account for, or when collapsing would not be structurally safe. */
function planOccurrence(
  occ: OccurrenceSpan, paras: Element[], runsOf: (para: number) => Element[],
): OccurrencePlan | null {
  let collapse: OccurrencePlan['collapse'] = null;
  if (isMultiPara(occ)) {
    const spanned: Element[] = [];
    for (let p = occ.start.para; p <= occ.end.para; p++) {
      const el = paras[p];
      if (!el) return null;
      spanned.push(el);
    }
    // Collapsing is only safe between sibling paragraphs. A span reaching
    // into a different parent (another table cell, the body from inside a
    // cell, a block content control) would need structure surgery this pass
    // does not attempt — and removing a cell's paragraphs could leave a
    // <w:tc> with no <w:p>, which is invalid table XML. Refuse instead.
    const parent = spanned[0].parentNode;
    for (const el of spanned) {
      if (el.parentNode !== parent) return null;
    }
    collapse = { anchor: spanned[0], tail: spanned[spanned.length - 1], remove: spanned.slice(1) };
  }

  const edits = new Map<Element, NodeEdit>();
  let deleted = '';
  let insertPlaced = false;

  for (let p = occ.start.para; p <= occ.end.para; p++) {
    const runs = runsOf(p);
    const firstRun = p === occ.start.para ? occ.start.run : 0;
    // Covered text reaches the end of every spanned paragraph except the
    // last, so those paragraphs are walked to their final run; runs after
    // the end position in the last paragraph stay untouched and move into
    // the anchor paragraph wholesale.
    const lastRun = p === occ.end.para ? occ.end.run : runs.length - 1;

    for (let r = firstRun; r <= lastRun; r++) {
      const run = runs[r];
      if (!run) return null;
      const from = p === occ.start.para && r === occ.start.run ? occ.start.off : 0;
      const to = p === occ.end.para && r === occ.end.run ? occ.end.off : Infinity;

      let cum = 0;
      for (const ch of Array.from(run.children)) {
        const n = localName(ch);
        if (n === 't') {
          const text = ch.textContent || '';
          const a = Math.max(from, cum);
          const b = Math.min(to, cum + text.length);
          if (a < b) {
            if (edits.has(ch)) return null;
            const edit: NodeEdit = { from: a - cum, to: b - cum };
            if (!insertPlaced) {
              edit.insert = `{{${occ.ph.name}}}`;
              insertPlaced = true;
            }
            edits.set(ch, edit);
            deleted += text.slice(a - cum, b - cum);
          }
          cum += text.length;
        } else if (!INERT_RUN_CHILDREN.has(n)) {
          return null;
        }
      }
    }
  }

  // The exact text being removed must match what the tokens said is there,
  // or the anchors are stale — never edit on a mismatch. For multi-paragraph
  // spans this also guards content the tokens never claimed (field-code
  // text, gaps between non-adjacent paragraphs): any such text would be
  // deleted by the full-paragraph walk above and fail this equality.
  if (!insertPlaced || deleted !== occ.covered) return null;
  return { edits, collapse };
}

const XML_NS = 'http://www.w3.org/XML/1998/namespace';

/** Insert {{NAME}} markers at token-anchor positions. Returns the edited XML
 *  plus the fields that could not be placed (they go to the text-search
 *  fallback), or null when positional tagging is unavailable entirely. */
function tagByAnchors(
  xml: string,
  placeholders: Placeholder[],
  tokens: WordToken[],
): { xml: string; failed: Set<Placeholder> } | null {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;

  const tokenById = new Map(tokens.map((t) => [t.id, t] as const));
  const failed = new Set<Placeholder>();
  const spans: OccurrenceSpan[] = [];

  // A failed multi-paragraph occurrence has no fallback: text search cannot
  // match text glued across <w:p> boundaries, so it is refused outright with
  // a warning instead of being handed to the text pass.
  const refuse = (ph: Placeholder) => {
    console.warn(
      `[documentTagger] field "${ph.name}": an occurrence spans paragraphs that cannot be ` +
      'collapsed safely; that occurrence was left untagged',
    );
  };

  for (const ph of placeholders) {
    for (const ids of ph.occurrences) {
      const span = resolveOccurrence(ph, ids, tokenById);
      if (span) {
        spans.push(span);
        continue;
      }
      // Unresolvable: route by whether the tokens sit in several paragraphs.
      const paraSet = new Set<number>();
      for (const id of ids) {
        const t = tokenById.get(id);
        if (t?.paraDocIndex !== undefined) paraSet.add(t.paraDocIndex);
      }
      if (paraSet.size > 1) refuse(ph);
      else failed.add(ph);
    }
  }

  // Occurrences sharing text (two fields claiming the same word) cannot both
  // be edited without corrupting each other; first in document order wins,
  // the other field falls back. Additionally, a collapse deletes paragraph
  // elements, so a later multi-paragraph span may not touch any paragraph an
  // earlier collapse consumes — its anchor would be edited while detached.
  // (Single-paragraph spans after a collapse's end position are safe: their
  // <w:t> splices ride along when the tail moves into the anchor.)
  spans.sort((a, b) => cmpPos(a.start, b.start));
  const accepted: OccurrenceSpan[] = [];
  let lastCollapseEnd = -1;
  for (const span of spans) {
    const prev = accepted[accepted.length - 1];
    if (prev && cmpPos(span.start, prev.end) < 0) {
      if (isMultiPara(span)) refuse(span.ph);
      else failed.add(span.ph);
      continue;
    }
    if (isMultiPara(span) && span.start.para <= lastCollapseEnd) {
      refuse(span.ph);
      continue;
    }
    accepted.push(span);
    if (isMultiPara(span)) lastCollapseEnd = Math.max(lastCollapseEnd, span.end.para);
  }

  const paras = listParagraphElements(doc);
  const runCache = new Map<number, Element[]>();
  const runsOf = (para: number): Element[] => {
    let runs = runCache.get(para);
    if (!runs) {
      runs = paras[para] ? listRunElements(paras[para]) : [];
      runCache.set(para, runs);
    }
    return runs;
  };

  const nodeEdits = new Map<Element, NodeEdit[]>();
  const collapses: NonNullable<OccurrencePlan['collapse']>[] = [];
  let planned = false;
  for (const span of accepted) {
    const plan = planOccurrence(span, paras, runsOf);
    if (!plan) {
      if (isMultiPara(span)) refuse(span.ph);
      else failed.add(span.ph);
      continue;
    }
    for (const [node, edit] of plan.edits) {
      const list = nodeEdits.get(node);
      if (list) list.push(edit);
      else nodeEdits.set(node, [edit]);
    }
    if (plan.collapse) collapses.push(plan.collapse);
    planned = true;
  }

  if (!planned) return { xml, failed };

  // All coordinates are pre-edit; applying each node's splices from last to
  // first keeps the earlier offsets valid.
  for (const [node, edits] of nodeEdits) {
    edits.sort((a, b) => b.from - a.from);
    let text = node.textContent || '';
    for (const e of edits) text = text.slice(0, e.from) + (e.insert ?? '') + text.slice(e.to);
    node.textContent = text;
    if (/^\s|\s$/.test(text)) node.setAttributeNS(XML_NS, 'xml:space', 'preserve');
  }

  // Collapse multi-paragraph spans: the tail paragraph's surviving content
  // (everything but its pPr — the collapsed field keeps the ANCHOR
  // paragraph's style by design) joins the anchor paragraph, then the
  // emptied paragraph elements are removed entirely. Node references in the
  // splices above stay valid across the re-parenting, so a tag another
  // field placed in the tail text rides along.
  for (const c of collapses) {
    for (const ch of Array.from(c.tail.children)) {
      if (localName(ch) !== 'pPr') c.anchor.appendChild(ch);
    }
    for (const el of c.remove) el.parentNode?.removeChild(el);
  }

  let out = new XMLSerializer().serializeToString(doc);
  if (!out.startsWith('<?xml')) {
    const decl = xml.match(/^<\?xml[^>]*\?>\s*/);
    if (decl) out = decl[0] + out;
  }
  // A template that no longer parses must never ship; losing positional
  // tagging is recoverable, a corrupt document.xml is not.
  if (new DOMParser().parseFromString(out, 'text/xml').getElementsByTagName('parsererror').length > 0) {
    return null;
  }

  return { xml: out, failed };
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function createTaggedTemplate(
  rawDocxBytes: ArrayBuffer,
  placeholders: Placeholder[],
  tokens?: WordToken[],
): ArrayBuffer {
  const zip = new PizZip(rawDocxBytes);
  const original = zip.file('word/document.xml')!.asText();

  // Image fields have no document text to replace (their tag lives in the
  // drawing's alt text) and an empty originalText would match everywhere,
  // so they are excluded from tagging entirely.
  const textFields = placeholders.filter((p) => p.type !== 'image' && p.originalText);

  // Position-based pass first: fields whose text spans runs with different
  // formatting (or several paragraphs, via collapse-and-replace) tag
  // correctly here. Failed single-paragraph occurrences fall through to the
  // legacy text-search pass below; failed multi-paragraph occurrences were
  // already refused with a warning inside the pass. Either way the final
  // check at the bottom warns about any field that reached the file with no
  // tag — nothing is silently dropped.
  let xml = original;
  let pending: Placeholder[] = textFields;
  if (tokens && tokens.length > 0) {
    const positional = tagByAnchors(original, textFields, tokens);
    if (positional) {
      xml = positional.xml;
      pending = textFields.filter((p) => positional.failed.has(p));
    }
  }

  xml = removeProofingMarks(xml);
  xml = mergeAdjacentRuns(xml);

  const sorted = [...pending].sort((a, b) => b.originalText.length - a.originalText.length);
  for (const ph of sorted) {
    const pattern = new RegExp(escapeRegExp(ph.originalText), 'g');
    xml = xml.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, (_, open, text, close) => {
      return open + text.replace(pattern, `{{${ph.name}}}`) + close;
    });
  }

  for (const ph of textFields) {
    if (!xml.includes(`{{${ph.name}}}`)) {
      console.warn(
        `[documentTagger] field "${ph.name}" could not be written into the template; ` +
        'its text spans document structure neither tagging pass supports',
      );
    }
  }

  zip.file('word/document.xml', xml);
  return zip.generate({ type: 'arraybuffer' });
}
