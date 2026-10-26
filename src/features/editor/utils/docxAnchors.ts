// Shared tree-order walkers tying text tokens to their exact position in
// word/document.xml. The parser (docxDirectParser) assigns each text token
// the index of its paragraph in listParagraphElements and of its run in
// listRunElements, plus a character offset within the run's <w:t> text; the
// template tagger (documentTagger) re-walks the same bytes with these same
// functions to find those positions again. Any change here changes the
// anchor coordinate system for both sides at once — keep both sides on
// these walkers, exactly like listDrawingElements in imageFieldXml.ts does
// for image tokens.

function localName(el: Element): string {
  return el.localName || el.nodeName.replace(/^[\w]+:/, '');
}

/** Drawings can embed whole paragraphs (text boxes); the parser never
 *  tokenizes that text, so the walkers do not descend into them. */
const OPAQUE = new Set(['drawing', 'pict', 'object']);

/** Every <w:p> in the document in pre-order, including paragraphs inside
 *  table cells and block-level content controls. */
export function listParagraphElements(doc: Document): Element[] {
  const out: Element[] = [];
  (function walk(el: Element) {
    for (const ch of Array.from(el.children)) {
      const n = localName(ch);
      if (OPAQUE.has(n)) continue;
      if (n === 'p') out.push(ch);
      walk(ch);
    }
  })(doc.documentElement);
  return out;
}

/** Every <w:r> under a paragraph in pre-order, including runs wrapped in
 *  hyperlink/smartTag/ins/fldSimple/sdt containers. */
export function listRunElements(p: Element): Element[] {
  const out: Element[] = [];
  (function walk(el: Element) {
    for (const ch of Array.from(el.children)) {
      const n = localName(ch);
      if (OPAQUE.has(n)) continue;
      if (n === 'r') out.push(ch);
      walk(ch);
    }
  })(p);
  return out;
}
