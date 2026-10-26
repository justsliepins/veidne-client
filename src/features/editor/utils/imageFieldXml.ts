import PizZip from 'pizzip';

// Tagging an image field means writing {{NAME}} into the drawing's alt text
// (wp:docPr descr, mirrored in pic:cNvPr descr, or v:shape alt for legacy
// VML), directly inside the stored document.xml. The tag then travels with
// the file: a downloaded tagged template re-uploads with its fields intact,
// and a user can pre-tag in Word by typing {{NAME}} into a picture's alt text.

const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const PIC_NS = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const V_NS = 'urn:schemas-microsoft-com:vml';

function localName(el: Element): string {
  return el.localName || el.nodeName.replace(/^[\w]+:/, '');
}

/** Pre-order walk over the body collecting every drawing/pict/object element.
 *  The parser assigns each image token its index in this exact list, so the
 *  tagger can find the same element again. Keep both sides on this walker. */
export function listDrawingElements(doc: Document): Element[] {
  const out: Element[] = [];
  const root = doc.documentElement;
  (function walk(el: Element) {
    for (const ch of Array.from(el.children)) {
      const n = localName(ch);
      if (n === 'drawing' || n === 'pict' || n === 'object') out.push(ch);
      walk(ch);
    }
  })(root);
  return out;
}

function nsFirst(el: Element, ns: string, local: string, prefixed: string): Element | null {
  const list = el.getElementsByTagNameNS(ns, local);
  if (list.length > 0) return list[0];
  const fb = el.getElementsByTagName(prefixed);
  return fb.length > 0 ? fb[0] : null;
}

function setOrClearDescr(el: Element | null, attr: string, tag: string | null): void {
  if (!el) return;
  if (tag === null) el.removeAttribute(attr);
  else el.setAttribute(attr, tag);
}

function applyTagToDrawing(drawing: Element, tag: string | null): void {
  setOrClearDescr(nsFirst(drawing, WP_NS, 'docPr', 'wp:docPr'), 'descr', tag);
  setOrClearDescr(nsFirst(drawing, PIC_NS, 'cNvPr', 'pic:cNvPr'), 'descr', tag);
  setOrClearDescr(nsFirst(drawing, V_NS, 'shape', 'v:shape'), 'alt', tag);
}

function patchDocumentXml(
  rawDocxBytes: ArrayBuffer,
  mutate: (doc: Document) => boolean,
): ArrayBuffer {
  const zip = new PizZip(rawDocxBytes);
  const file = zip.file('word/document.xml');
  if (!file) return rawDocxBytes;

  const doc = new DOMParser().parseFromString(file.asText(), 'text/xml');
  if (doc.querySelector('parsererror')) return rawDocxBytes;
  if (!mutate(doc)) return rawDocxBytes;

  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
  return zip.generate({ type: 'arraybuffer' }) as ArrayBuffer;
}

/** Write {{name}} into (or, with name null, clear from) the alt text of the
 *  drawing at the given tree-order index. Returns new docx bytes; the input
 *  is returned unchanged when the drawing cannot be found. */
export function setImageFieldTag(
  rawDocxBytes: ArrayBuffer,
  drawingIndex: number,
  name: string | null,
): ArrayBuffer {
  return patchDocumentXml(rawDocxBytes, (doc) => {
    const drawing = listDrawingElements(doc)[drawingIndex];
    if (!drawing) return false;
    applyTagToDrawing(drawing, name === null ? null : `{{${name}}}`);
    return true;
  });
}

/** Clear {{name}} tags from every drawing that carries them (sidebar delete
 *  of an image field with multiple tagged drawings). */
export function clearImageFieldTagsByName(rawDocxBytes: ArrayBuffer, name: string): ArrayBuffer {
  const tag = `{{${name}}}`;
  return patchDocumentXml(rawDocxBytes, (doc) => {
    let changed = false;
    for (const drawing of listDrawingElements(doc)) {
      const docPr = nsFirst(drawing, WP_NS, 'docPr', 'wp:docPr');
      const cNvPr = nsFirst(drawing, PIC_NS, 'cNvPr', 'pic:cNvPr');
      const shape = nsFirst(drawing, V_NS, 'shape', 'v:shape');
      const tagged = docPr?.getAttribute('descr') === tag
        || cNvPr?.getAttribute('descr') === tag
        || shape?.getAttribute('alt') === tag;
      if (tagged) {
        applyTagToDrawing(drawing, null);
        changed = true;
      }
    }
    return changed;
  });
}

/** The field name carried by a drawing's alt text, or null. */
export function imageFieldNameFromDescr(descr: string | undefined): string | null {
  if (!descr) return null;
  const m = descr.match(/^\{\{(.+)\}\}$/);
  const name = m?.[1].trim();
  return name ? name : null;
}
