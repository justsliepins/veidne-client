import PizZip from 'pizzip';
import type { WordToken, PageLayout, ParagraphStyle } from './types';
import { listDrawingElements } from './imageFieldXml';
import { listParagraphElements, listRunElements } from './docxAnchors';
import { features } from '@/config/features';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const PIC_NS = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const V_NS = 'urn:schemas-microsoft-com:vml';
const TWIPS_TO_PX = 96 / 1440;
const HALF_PT_TO_PX = 2 / 3; // w:sz half-points → px (24 half-pt = 12pt = 16px)
const EMU_PER_PT = 12700;

// ── XML helpers ──────────────────────────────────────────────────────────────

function ln(el: Element): string {
  return el.localName || el.nodeName.replace(/^[\w]+:/, '');
}

function child(parent: Element, name: string): Element | null {
  for (const ch of Array.from(parent.children)) {
    if (ln(ch) === name) return ch;
  }
  return null;
}

function childrenOf(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter(ch => ln(ch) === name);
}

function wAttr(el: Element | null | undefined, name: string): string | null {
  if (!el) return null;
  const v = el.getAttributeNS(W_NS, name);
  if (v !== null) return v;
  return el.getAttribute(`w:${name}`);
}

function wNum(el: Element | null | undefined, name: string, fallback: number): number {
  const v = wAttr(el, name);
  if (v === null) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

function findAll(root: Document | Element, tag: string): Element[] {
  if ('getElementsByTagNameNS' in root) {
    const ns = root.getElementsByTagNameNS(W_NS, tag);
    if (ns.length > 0) return Array.from(ns);
  }
  return Array.from(root.getElementsByTagName(`w:${tag}`));
}

function nsFirst(el: Element, ns: string, local: string, prefixed: string): Element | null {
  const list = el.getElementsByTagNameNS(ns, local);
  if (list.length > 0) return list[0];
  const fb = el.getElementsByTagName(prefixed);
  return fb.length > 0 ? fb[0] : null;
}

// ── Media resolution (word/media via document.xml.rels) ─────────────────────

const MEDIA_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
};

type MediaResolver = (relId: string) => string | null;

interface ParseCtx {
  media: MediaResolver;
  /** Tree-order index of every drawing/pict/object element in the body,
   *  matching listDrawingElements in imageFieldXml.ts. */
  drawingIndex: Map<Element, number>;
  /** Tree-order index of every paragraph element, matching
   *  listParagraphElements in docxAnchors.ts. Text tokens carry these
   *  indexes so the template tagger can find their runs again. */
  paraIndex: Map<Element, number>;
}

/** Positional anchor context for the paragraph currently being tokenized:
 *  its docxAnchors ordinal and the run→ordinal map from listRunElements. */
interface AnchorCtx {
  paraDocIndex: number | undefined;
  runIndex: Map<Element, number>;
}

/** Resolve a:blip / v:imagedata rel ids to object URLs over the docx zip.
 *  Browser-renderable formats only; EMF/WMF and friends resolve to null so
 *  their drawings stay untokenized (and pass through generation untouched).
 *  URLs are cached per rel id; revocation happens in the editor store when a
 *  document is replaced or the session resets. */
function buildMediaResolver(zip: PizZip): MediaResolver {
  const targets = new Map<string, string>();
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsXml = new DOMParser().parseFromString(relsFile.asText(), 'text/xml');
    for (const rel of Array.from(relsXml.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) targets.set(id, target);
    }
  }

  const urlCache = new Map<string, string | null>();
  return (relId) => {
    const cached = urlCache.get(relId);
    if (cached !== undefined) return cached;

    let url: string | null = null;
    const target = targets.get(relId);
    if (target) {
      const path = target.startsWith('/') ? target.slice(1) : `word/${target.replace(/^\.\//, '')}`;
      const ext = (path.split('.').pop() || '').toLowerCase();
      const mime = MEDIA_MIME[ext];
      const file = mime ? zip.file(path) : null;
      if (file) {
        const bytes = file.asUint8Array();
        const copy = new Uint8Array(bytes.length);
        copy.set(bytes);
        url = URL.createObjectURL(new Blob([copy.buffer], { type: mime }));
      }
    }
    urlCache.set(relId, url);
    return url;
  };
}

/** Image token from a DrawingML <w:drawing> (inline or anchored). */
function imageTokenFromDrawing(
  drawing: Element, ctx: ParseCtx, pIdx: number, c: { i: number },
): WordToken | null {
  const blip = nsFirst(drawing, A_NS, 'blip', 'a:blip');
  if (!blip) return null;
  const relId = blip.getAttributeNS(R_NS, 'embed') || blip.getAttribute('r:embed');
  if (!relId) return null;
  const url = ctx.media(relId);
  if (!url) return null;

  const token: WordToken = { id: `w-${c.i++}`, text: url, type: 'image', paragraphIndex: pIdx, imageRelId: relId, imageDocIndex: ctx.drawingIndex.get(drawing) };

  const extent = nsFirst(drawing, WP_NS, 'extent', 'wp:extent');
  if (extent) {
    const cx = parseInt(extent.getAttribute('cx') || '', 10);
    const cy = parseInt(extent.getAttribute('cy') || '', 10);
    if (cx > 0) token.imageEmuW = cx;
    if (cy > 0) token.imageEmuH = cy;
  }

  const docPr = nsFirst(drawing, WP_NS, 'docPr', 'wp:docPr');
  const cNvPr = nsFirst(drawing, PIC_NS, 'cNvPr', 'pic:cNvPr');
  const name = docPr?.getAttribute('name') || cNvPr?.getAttribute('name');
  const descr = docPr?.getAttribute('descr') || cNvPr?.getAttribute('descr');
  if (name) token.imageName = name;
  if (descr) token.imageDescr = descr;

  return token;
}

/** Image token from a legacy VML <w:pict> / <w:object> with v:imagedata. */
function imageTokenFromPict(
  pict: Element, ctx: ParseCtx, pIdx: number, c: { i: number },
): WordToken | null {
  const imagedata = nsFirst(pict, V_NS, 'imagedata', 'v:imagedata');
  if (!imagedata) return null;
  const relId = imagedata.getAttributeNS(R_NS, 'id') || imagedata.getAttribute('r:id');
  if (!relId) return null;
  const url = ctx.media(relId);
  if (!url) return null;

  const token: WordToken = { id: `w-${c.i++}`, text: url, type: 'image', paragraphIndex: pIdx, imageRelId: relId, imageDocIndex: ctx.drawingIndex.get(pict) };

  const shape = nsFirst(pict, V_NS, 'shape', 'v:shape');
  const style = shape?.getAttribute('style') || '';
  const wM = style.match(/width:\s*([\d.]+)pt/);
  const hM = style.match(/height:\s*([\d.]+)pt/);
  if (wM) token.imageEmuW = Math.round(parseFloat(wM[1]) * EMU_PER_PT);
  if (hM) token.imageEmuH = Math.round(parseFloat(hM[1]) * EMU_PER_PT);

  const title = shape?.getAttribute('alt');
  if (title) token.imageDescr = title;

  return token;
}

// ── Heading map from styles.xml ──────────────────────────────────────────────

function buildHeadingMap(zip: PizZip): Map<string, number> {
  const map = new Map<string, number>();
  const file = zip.file('word/styles.xml');
  if (!file) {
    // Fallback: common built-in heading style IDs
    for (let i = 1; i <= 6; i++) map.set(`Heading${i}`, i);
    map.set('Title', 1);
    return map;
  }

  const xml = new DOMParser().parseFromString(file.asText(), 'text/xml');
  for (const style of findAll(xml, 'style')) {
    if (wAttr(style, 'type') !== 'paragraph') continue;
    const styleId = wAttr(style, 'styleId');
    if (!styleId) continue;

    // Check outlineLvl in paragraph properties
    const pPr = child(style, 'pPr');
    if (pPr) {
      const olEl = child(pPr, 'outlineLvl');
      if (olEl) {
        const val = wNum(olEl, 'val', -1);
        if (val >= 0 && val <= 5) { map.set(styleId, val + 1); continue; }
      }
    }

    // Fallback: check style name
    const nameEl = child(style, 'name');
    if (nameEl) {
      const name = (wAttr(nameEl, 'val') || '').toLowerCase();
      const m = name.match(/^heading\s*(\d)$/);
      if (m) { const lv = parseInt(m[1]); if (lv >= 1 && lv <= 6) map.set(styleId, lv); }
      else if (name === 'title') map.set(styleId, 1);
    }
  }
  return map;
}

// ── Theme fonts from theme1.xml ──────────────────────────────────────────────

interface ThemeFonts {
  minor: string | null;  // e.g. "Calibri"
  major: string | null;  // e.g. "Calibri Light"
}

function buildThemeFonts(zip: PizZip): ThemeFonts {
  const tf: ThemeFonts = { minor: null, major: null };
  const file = zip.file('word/theme/theme1.xml');
  if (!file) return tf;

  const xml = new DOMParser().parseFromString(file.asText(), 'text/xml');

  // Find <a:fontScheme> → <a:majorFont>/<a:minorFont> → <a:latin typeface="..."/>
  const fontSchemes = xml.getElementsByTagNameNS(A_NS, 'fontScheme');
  if (fontSchemes.length === 0) return tf;
  const scheme = fontSchemes[0];

  const majorFonts = scheme.getElementsByTagNameNS(A_NS, 'majorFont');
  if (majorFonts[0]) {
    const latins = majorFonts[0].getElementsByTagNameNS(A_NS, 'latin');
    if (latins[0]) tf.major = latins[0].getAttribute('typeface');
  }

  const minorFonts = scheme.getElementsByTagNameNS(A_NS, 'minorFont');
  if (minorFonts[0]) {
    const latins = minorFonts[0].getElementsByTagNameNS(A_NS, 'latin');
    if (latins[0]) tf.minor = latins[0].getAttribute('typeface');
  }

  return tf;
}

/** Resolve font family from <w:rFonts>, checking explicit attrs first, then theme refs */
function resolveFontFamily(rFonts: Element | null, themeFonts: ThemeFonts): string | undefined {
  if (!rFonts) return undefined;

  // Explicit font name takes priority
  const explicit = wAttr(rFonts, 'ascii') || wAttr(rFonts, 'hAnsi') || wAttr(rFonts, 'cs');
  if (explicit) return explicit;

  // Resolve theme font references
  const theme = wAttr(rFonts, 'asciiTheme') || wAttr(rFonts, 'hAnsiTheme') || wAttr(rFonts, 'cstheme');
  if (theme) {
    if (theme.startsWith('minor')) return themeFonts.minor || undefined;
    if (theme.startsWith('major')) return themeFonts.major || undefined;
  }

  return undefined;
}

// ── Style inheritance from styles.xml ────────────────────────────────────────

interface ResolvedStyle {
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spacingBefore?: number;
  spacingAfter?: number;
  lineHeight?: number;
}

interface DocDefaults {
  rPr: ResolvedStyle;  // document-level run defaults
}

function extractRunStyle(rPr: Element | null, themeFonts: ThemeFonts): ResolvedStyle {
  const s: ResolvedStyle = {};
  if (!rPr) return s;

  const bEl = child(rPr, 'b');
  if (bEl) { const v = wAttr(bEl, 'val'); s.bold = v !== '0' && v !== 'false'; }

  const iEl = child(rPr, 'i');
  if (iEl) { const v = wAttr(iEl, 'val'); s.italic = v !== '0' && v !== 'false'; }

  const uEl = child(rPr, 'u');
  if (uEl) { const v = wAttr(uEl, 'val'); if (v && v !== 'none') s.underline = true; }

  const szEl = child(rPr, 'sz');
  if (szEl) { const v = wNum(szEl, 'val', -1); if (v > 0) s.fontSize = Math.round(v * HALF_PT_TO_PX); }

  const ff = resolveFontFamily(child(rPr, 'rFonts'), themeFonts);
  if (ff) s.fontFamily = ff;

  const colorEl = child(rPr, 'color');
  if (colorEl) {
    const v = wAttr(colorEl, 'val');
    if (v && v !== 'auto' && /^[0-9A-Fa-f]{6}$/.test(v)) s.color = `#${v}`;
  }

  return s;
}

function extractParaStyle(pPr: Element | null): ResolvedStyle {
  const s: ResolvedStyle = {};
  if (!pPr) return s;

  const jc = child(pPr, 'jc');
  if (jc) {
    const val = wAttr(jc, 'val');
    if (val === 'center') s.alignment = 'center';
    else if (val === 'right' || val === 'end') s.alignment = 'right';
    else if (val === 'both' || val === 'distribute') s.alignment = 'justify';
    else if (val === 'left' || val === 'start') s.alignment = 'left';
  }

  const spacing = child(pPr, 'spacing');
  if (spacing) {
    const before = wNum(spacing, 'before', -1);
    if (before >= 0) s.spacingBefore = Math.round(before * TWIPS_TO_PX);
    const after = wNum(spacing, 'after', -1);
    if (after >= 0) s.spacingAfter = Math.round(after * TWIPS_TO_PX);
    const line = wNum(spacing, 'line', -1);
    if (line > 0) s.lineHeight = Math.round((line / 240) * 100) / 100;
  }

  return s;
}

function mergeStyle(base: ResolvedStyle, override: ResolvedStyle): ResolvedStyle {
  const result = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v !== undefined) (result as Record<string, unknown>)[k] = v;
  }
  return result;
}

interface StyleMap {
  docDefaults: DocDefaults;
  styles: Record<string, { pStyle: ResolvedStyle; rStyle: ResolvedStyle }>;
}

function buildStyleMap(zip: PizZip, themeFonts: ThemeFonts): StyleMap {
  const docDefaults: DocDefaults = { rPr: {} };
  const styles: Record<string, { pStyle: ResolvedStyle; rStyle: ResolvedStyle }> = {};

  const file = zip.file('word/styles.xml');
  if (!file) return { docDefaults, styles };

  const xml = new DOMParser().parseFromString(file.asText(), 'text/xml');

  // Extract document defaults
  const defEls = findAll(xml, 'docDefaults');
  if (defEls[0]) {
    const rPrDefault = child(defEls[0], 'rPrDefault');
    if (rPrDefault) {
      const rPr = child(rPrDefault, 'rPr');
      docDefaults.rPr = extractRunStyle(rPr, themeFonts);
    }
  }

  // First pass: extract raw styles (without basedOn resolution)
  const rawStyles: Record<string, { basedOn?: string; pStyle: ResolvedStyle; rStyle: ResolvedStyle }> = {};
  for (const styleEl of findAll(xml, 'style')) {
    const styleId = wAttr(styleEl, 'styleId');
    if (!styleId) continue;

    const basedOnEl = child(styleEl, 'basedOn');
    const basedOn = basedOnEl ? wAttr(basedOnEl, 'val') || undefined : undefined;

    const pPr = child(styleEl, 'pPr');
    const rPr = child(styleEl, 'rPr');
    rawStyles[styleId] = {
      basedOn,
      pStyle: extractParaStyle(pPr),
      rStyle: extractRunStyle(rPr, themeFonts),
    };
  }

  // Second pass: resolve one level of basedOn
  for (const [id, raw] of Object.entries(rawStyles)) {
    let pStyle = raw.pStyle;
    let rStyle = raw.rStyle;
    if (raw.basedOn && rawStyles[raw.basedOn]) {
      const base = rawStyles[raw.basedOn];
      pStyle = mergeStyle(base.pStyle, raw.pStyle);
      rStyle = mergeStyle(base.rStyle, raw.rStyle);
    }
    styles[id] = { pStyle, rStyle };
  }

  return { docDefaults, styles };
}

// ── Page layout ──────────────────────────────────────────────────────────────

function defaultLayout(): PageLayout {
  return { pageWidth: 816, pageHeight: 1056, marginTop: 96, marginBottom: 96, marginLeft: 96, marginRight: 96 };
}

function extractPageLayout(xml: Document): PageLayout {
  const pgSz = findAll(xml, 'pgSz')[0];
  const pgMar = findAll(xml, 'pgMar')[0];
  return {
    pageWidth: Math.round(wNum(pgSz, 'w', 12240) * TWIPS_TO_PX),
    pageHeight: Math.round(wNum(pgSz, 'h', 15840) * TWIPS_TO_PX),
    marginTop: Math.round(wNum(pgMar, 'top', 1440) * TWIPS_TO_PX),
    marginBottom: Math.round(wNum(pgMar, 'bottom', 1440) * TWIPS_TO_PX),
    marginLeft: Math.round(wNum(pgMar, 'left', 1440) * TWIPS_TO_PX),
    marginRight: Math.round(wNum(pgMar, 'right', 1440) * TWIPS_TO_PX),
  };
}

// ── Paragraph properties ─────────────────────────────────────────────────────

interface ParagraphInfo {
  heading?: number;
  styleId?: string;
  style: ParagraphStyle;
  pageBreakBefore: boolean;
}

function parseParagraphProps(pPr: Element | null, headingMap: Map<string, number>, styleMap: StyleMap): ParagraphInfo {
  const info: ParagraphInfo = { style: {}, pageBreakBefore: false };
  if (!pPr) return info;

  // Named style
  const pStyleEl = child(pPr, 'pStyle');
  if (pStyleEl) {
    const styleId = wAttr(pStyleEl, 'val');
    if (styleId) {
      info.styleId = styleId;
      if (headingMap.has(styleId)) info.heading = headingMap.get(styleId);
      // Apply named style as base paragraph formatting
      const namedStyle = styleMap.styles[styleId];
      if (namedStyle) {
        const ps = namedStyle.pStyle;
        if (ps.alignment) info.style.alignment = ps.alignment;
        if (ps.spacingBefore !== undefined) info.style.spacingBefore = ps.spacingBefore;
        if (ps.spacingAfter !== undefined) info.style.spacingAfter = ps.spacingAfter;
        if (ps.lineHeight !== undefined) info.style.lineHeight = ps.lineHeight;
      }
    }
  }

  // Direct formatting overrides named style
  const jc = child(pPr, 'jc');
  if (jc) {
    const val = wAttr(jc, 'val');
    if (val === 'center') info.style.alignment = 'center';
    else if (val === 'right' || val === 'end') info.style.alignment = 'right';
    else if (val === 'both' || val === 'distribute') info.style.alignment = 'justify';
    else if (val === 'left' || val === 'start') info.style.alignment = 'left';
  }

  const spacing = child(pPr, 'spacing');
  if (spacing) {
    const before = wNum(spacing, 'before', -1);
    if (before >= 0) info.style.spacingBefore = Math.round(before * TWIPS_TO_PX);
    const after = wNum(spacing, 'after', -1);
    if (after >= 0) info.style.spacingAfter = Math.round(after * TWIPS_TO_PX);
    const line = wNum(spacing, 'line', -1);
    if (line > 0) info.style.lineHeight = Math.round((line / 240) * 100) / 100;
  }

  // Indentation
  const ind = child(pPr, 'ind');
  if (ind) {
    const left = wNum(ind, 'left', -1);
    if (left > 0) info.style.indentLeft = Math.round(left * TWIPS_TO_PX);
    const firstLine = wNum(ind, 'firstLine', -1);
    if (firstLine > 0) info.style.indentFirstLine = Math.round(firstLine * TWIPS_TO_PX);
    const hanging = wNum(ind, 'hanging', -1);
    if (hanging > 0) info.style.indentFirstLine = -Math.round(hanging * TWIPS_TO_PX);
  }

  // Page break before
  if (child(pPr, 'pageBreakBefore')) info.pageBreakBefore = true;

  return info;
}

// ── Run properties ───────────────────────────────────────────────────────────

interface RunProps {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

function parseRunProps(rPr: Element | null, inherited: ResolvedStyle, themeFonts: ThemeFonts): RunProps {
  // Start from inherited (doc defaults → named style)
  const p: RunProps = {
    bold: inherited.bold || false,
    italic: inherited.italic || false,
    underline: inherited.underline || false,
    fontSize: inherited.fontSize,
    fontFamily: inherited.fontFamily,
    color: inherited.color,
  };
  if (!rPr) return p;

  // Direct formatting overrides
  const bEl = child(rPr, 'b');
  if (bEl) { const v = wAttr(bEl, 'val'); p.bold = v !== '0' && v !== 'false'; }

  const iEl = child(rPr, 'i');
  if (iEl) { const v = wAttr(iEl, 'val'); p.italic = v !== '0' && v !== 'false'; }

  const uEl = child(rPr, 'u');
  if (uEl) { const v = wAttr(uEl, 'val'); p.underline = !!v && v !== 'none'; }

  const szEl = child(rPr, 'sz');
  if (szEl) { const v = wNum(szEl, 'val', -1); if (v > 0) p.fontSize = Math.round(v * HALF_PT_TO_PX); }

  const ff = resolveFontFamily(child(rPr, 'rFonts'), themeFonts);
  if (ff) p.fontFamily = ff;

  const colorEl = child(rPr, 'color');
  if (colorEl) {
    const v = wAttr(colorEl, 'val');
    if (v && v !== 'auto' && /^[0-9A-Fa-f]{6}$/.test(v)) p.color = `#${v}`;
  }

  return p;
}

// ── Text tokenization ────────────────────────────────────────────────────────

function tokenizeText(
  text: string, props: RunProps, pIdx: number, heading: number | undefined, c: { i: number },
  paraDocIndex?: number, runDocIndex?: number, charBase = 0,
): WordToken[] {
  const tokens: WordToken[] = [];
  const anchored = paraDocIndex !== undefined && runDocIndex !== undefined;
  let off = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    const token: WordToken = {
      id: `w-${c.i++}`, text: part,
      type: /^\s+$/.test(part) ? 'space' : 'word',
      paragraphIndex: pIdx, heading,
      bold: props.bold || undefined, italic: props.italic || undefined,
      fontSize: props.fontSize, fontFamily: props.fontFamily,
      color: props.color, underline: props.underline || undefined,
    };
    if (anchored) {
      token.paraDocIndex = paraDocIndex;
      token.runDocIndex = runDocIndex;
      token.charOffset = charBase + off;
    }
    tokens.push(token);
    off += part.length;
  }
  return tokens;
}

// ── Process runs within a paragraph ──────────────────────────────────────────

function processRun(
  run: Element, props: RunProps, pIdx: number, heading: number | undefined,
  c: { i: number }, tokens: WordToken[], field: { inCode: boolean }, ctx: ParseCtx,
  anchors: AnchorCtx,
) {
  const runDocIndex = anchors.runIndex.get(run);
  // Offset within the concatenation of this run's direct <w:t> text — the
  // charOffset coordinate the template tagger walks with. It advances for
  // EVERY w:t, including field-code text that emits no tokens, so both
  // sides count the same characters.
  let charCursor = 0;
  for (const ch of Array.from(run.children)) {
    const n = ln(ch);
    if (n === 'rPr') continue;

    if (n === 'fldChar') {
      const ft = wAttr(ch, 'fldCharType');
      if (ft === 'begin') field.inCode = true;
      else if (ft === 'separate' || ft === 'end') field.inCode = false;
      continue;
    }
    if (n === 'instrText' || n === 'lastRenderedPageBreak') continue;

    if (n === 't') {
      const text = ch.textContent || '';
      if (text && !field.inCode) {
        tokens.push(...tokenizeText(text, props, pIdx, heading, c,
          anchors.paraDocIndex, runDocIndex, charCursor));
      }
      charCursor += text.length;
      continue;
    }
    if (field.inCode) continue;

    if (n === 'drawing') {
      const tok = imageTokenFromDrawing(ch, ctx, pIdx, c);
      if (tok) tokens.push(tok);
      continue;
    }
    if (n === 'pict' || n === 'object') {
      const tok = imageTokenFromPict(ch, ctx, pIdx, c);
      if (tok) tokens.push(tok);
      continue;
    }

    if (n === 'br') {
      const brType = wAttr(ch, 'type');
      if (brType === 'page') {
        tokens.push({ id: `w-${c.i++}`, text: '', type: 'pageBreak', paragraphIndex: pIdx });
      } else {
        tokens.push({ id: `w-${c.i++}`, text: '\n', type: 'newline', paragraphIndex: pIdx, heading });
      }
    } else if (n === 'tab') {
      tokens.push({
        id: `w-${c.i++}`, text: '\t', type: 'space', paragraphIndex: pIdx, heading,
        bold: props.bold || undefined, italic: props.italic || undefined,
        fontSize: props.fontSize, fontFamily: props.fontFamily,
        color: props.color, underline: props.underline || undefined,
      });
    } else if (n === 'cr') {
      tokens.push({ id: `w-${c.i++}`, text: '\n', type: 'newline', paragraphIndex: pIdx, heading });
    }
  }
}

function processParagraphChildren(
  parent: Element, pIdx: number, heading: number | undefined,
  c: { i: number }, tokens: WordToken[], field: { inCode: boolean },
  inheritedRun: ResolvedStyle, themeFonts: ThemeFonts, ctx: ParseCtx,
  anchors: AnchorCtx,
) {
  for (const ch of Array.from(parent.children)) {
    const n = ln(ch);
    if (n === 'pPr') continue;

    if (n === 'r') {
      processRun(ch, parseRunProps(child(ch, 'rPr'), inheritedRun, themeFonts), pIdx, heading, c, tokens, field, ctx, anchors);
    } else if (n === 'hyperlink' || n === 'smartTag' || n === 'ins' || n === 'fldSimple') {
      for (const sub of Array.from(ch.children)) {
        if (ln(sub) === 'r') processRun(sub, parseRunProps(child(sub, 'rPr'), inheritedRun, themeFonts), pIdx, heading, c, tokens, field, ctx, anchors);
      }
    } else if (n === 'sdt') {
      const content = child(ch, 'sdtContent');
      if (content) {
        for (const sub of Array.from(content.children)) {
          if (ln(sub) === 'r') processRun(sub, parseRunProps(child(sub, 'rPr'), inheritedRun, themeFonts), pIdx, heading, c, tokens, field, ctx, anchors);
        }
      }
    }
    // Skip: del, bookmarkStart, bookmarkEnd, proofErr, etc.
  }
}

// ── Process a single paragraph ───────────────────────────────────────────────

function processParagraph(
  p: Element, pIdx: number, headingMap: Map<string, number>,
  c: { i: number }, tokens: WordToken[],
  paragraphStyles: Record<number, ParagraphStyle>,
  styleMap: StyleMap, themeFonts: ThemeFonts, ctx: ParseCtx,
) {
  const { heading, styleId, style, pageBreakBefore } = parseParagraphProps(child(p, 'pPr'), headingMap, styleMap);

  if (pageBreakBefore) {
    tokens.push({ id: `w-${c.i++}`, text: '', type: 'pageBreak', paragraphIndex: pIdx });
  }

  // Build inherited run style: doc defaults → named style rPr
  let inheritedRun: ResolvedStyle = { ...styleMap.docDefaults.rPr };
  if (styleId && styleMap.styles[styleId]) {
    inheritedRun = mergeStyle(inheritedRun, styleMap.styles[styleId].rStyle);
  }

  // Positional anchors: this paragraph's ordinal in the shared walk, and
  // each run's ordinal within it, so text tokens can be located again by
  // the template tagger.
  const runIndex = new Map<Element, number>();
  listRunElements(p).forEach((r, i) => runIndex.set(r, i));
  const anchors: AnchorCtx = { paraDocIndex: ctx.paraIndex.get(p), runIndex };

  // Track font sizes for dominant paragraph fontSize
  const beforeLen = tokens.length;
  const field = { inCode: false };
  processParagraphChildren(p, pIdx, heading, c, tokens, field, inheritedRun, themeFonts, ctx, anchors);

  // Empty paragraph → non-breaking space. The filler is a structural marker:
  // it carries the paragraph's document position (no run/char — there is no
  // run) so a multi-paragraph field may span the blank line, but it
  // contributes zero text everywhere text is computed.
  if (tokens.length === beforeLen || (tokens.length === beforeLen + 1 && tokens[tokens.length - 1].type === 'pageBreak')) {
    tokens.push({ id: `w-${c.i++}`, text: '\u00A0', type: 'word', paragraphIndex: pIdx, heading,
      paraDocIndex: anchors.paraDocIndex, isEmptyParagraphFiller: true });
  }

  // Compute dominant paragraph fontSize from word tokens
  const paraTokens = tokens.slice(beforeLen).filter(t => t.type === 'word' && t.fontSize);
  if (paraTokens.length > 0) {
    const counts = new Map<number, number>();
    for (const t of paraTokens) {
      if (t.fontSize) counts.set(t.fontSize, (counts.get(t.fontSize) || 0) + 1);
    }
    let maxCount = 0, dominant = 0;
    for (const [size, count] of counts) { if (count > maxCount) { maxCount = count; dominant = size; } }
    style.fontSize = dominant;
  }

  if (Object.keys(style).length > 0) paragraphStyles[pIdx] = style;
}

// ── Process table into cell-level tokens ─────────────────────────────────────

let tableCounter = 0;

function processTable(
  tbl: Element, pIdx: number, headingMap: Map<string, number>,
  c: { i: number }, tokens: WordToken[],
  paragraphStyles: Record<number, ParagraphStyle>,
  styleMap: StyleMap, themeFonts: ThemeFonts, ctx: ParseCtx,
): number {
  const tableId = `tbl-${tableCounter++}`;

  // Extract column widths from <w:tblGrid><w:gridCol>
  const colWidths: number[] = [];
  const tblGrid = child(tbl, 'tblGrid');
  if (tblGrid) {
    for (const gc of childrenOf(tblGrid, 'gridCol')) {
      const w = wNum(gc, 'w', 0);
      colWidths.push(w > 0 ? Math.round(w * TWIPS_TO_PX) : 0);
    }
  }

  // Track vMerge state: which columns have a "restart" rowSpan in progress
  // Key: col index, Value: { startRow, count }
  const vMergeTracking = new Map<number, { startRow: number; tokenIdx: number; count: number }>();

  const rows = childrenOf(tbl, 'tr');
  let isFirst = true;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const cells = childrenOf(row, 'tc');
    let logicalCol = 0;

    for (const cell of cells) {
      const tcPr = child(cell, 'tcPr');

      // colSpan from gridSpan
      let colSpan = 1;
      if (tcPr) {
        const gridSpanEl = child(tcPr, 'gridSpan');
        if (gridSpanEl) colSpan = wNum(gridSpanEl, 'val', 1);
      }

      // vMerge: rowSpan handling
      let skipCell = false;
      if (tcPr) {
        const vMergeEl = child(tcPr, 'vMerge');
        if (vMergeEl) {
          const val = wAttr(vMergeEl, 'val');
          if (val === 'restart') {
            // Start of a vertical merge
            vMergeTracking.set(logicalCol, { startRow: rowIdx, tokenIdx: tokens.length, count: 1 });
          } else {
            // Continuation of a vertical merge (no val or val="continue")
            skipCell = true;
            const tracker = vMergeTracking.get(logicalCol);
            if (tracker) tracker.count++;
          }
        } else {
          // No vMerge — clear any tracking for this column
          vMergeTracking.delete(logicalCol);
        }
      } else {
        vMergeTracking.delete(logicalCol);
      }

      if (!skipCell) {
        // Process paragraphs inside the cell
        const paras = childrenOf(cell, 'p');
        const cellTokenStart = tokens.length;

        for (let pi = 0; pi < paras.length; pi++) {
          processParagraph(paras[pi], pIdx, headingMap, c, tokens, paragraphStyles, styleMap, themeFonts, ctx);
          pIdx++;
        }

        // If cell was empty (no paragraphs or only empty ones), ensure at least one token
        if (tokens.length === cellTokenStart) {
          tokens.push({ id: `w-${c.i++}`, text: '\u00A0', type: 'word', paragraphIndex: pIdx });
          pIdx++;
        }

        // Tag all tokens from this cell with table metadata
        for (let ti = cellTokenStart; ti < tokens.length; ti++) {
          tokens[ti].tableId = tableId;
          tokens[ti].cellRow = rowIdx;
          tokens[ti].cellCol = logicalCol;
          if (colSpan > 1) tokens[ti].cellColSpan = colSpan;
        }

        // Mark the first token of the entire table
        if (isFirst && cellTokenStart < tokens.length) {
          tokens[cellTokenStart].isTableStart = true;
          tokens[cellTokenStart].tableColWidths = colWidths.length > 0 ? colWidths : undefined;
          isFirst = false;
        }
      }

      logicalCol += colSpan;
    }
  }

  // Second pass: apply rowSpan values to the starting tokens
  for (const [_col, tracker] of vMergeTracking) {
    if (tracker.count > 1 && tracker.tokenIdx < tokens.length) {
      tokens[tracker.tokenIdx].cellRowSpan = tracker.count;
    }
  }

  return pIdx;
}

// ── Walk body ────────────────────────────────────────────────────────────────

function parseBody(
  body: Element, headingMap: Map<string, number>, styleMap: StyleMap, themeFonts: ThemeFonts, ctx: ParseCtx,
): { tokens: WordToken[]; paragraphStyles: Record<number, ParagraphStyle> } {
  const tokens: WordToken[] = [];
  const paragraphStyles: Record<number, ParagraphStyle> = {};
  const c = { i: 0 };
  let pIdx = 0;

  for (const el of Array.from(body.children)) {
    const n = ln(el);

    if (n === 'p') {
      processParagraph(el, pIdx, headingMap, c, tokens, paragraphStyles, styleMap, themeFonts, ctx);
      pIdx++;
    } else if (n === 'tbl') {
      pIdx = processTable(el, pIdx, headingMap, c, tokens, paragraphStyles, styleMap, themeFonts, ctx);
    } else if (n === 'sdt') {
      const content = child(el, 'sdtContent');
      if (content) {
        for (const sub of Array.from(content.children)) {
          const sn = ln(sub);
          if (sn === 'p') {
            processParagraph(sub, pIdx, headingMap, c, tokens, paragraphStyles, styleMap, themeFonts, ctx);
            pIdx++;
          } else if (sn === 'tbl') {
            pIdx = processTable(sub, pIdx, headingMap, c, tokens, paragraphStyles, styleMap, themeFonts, ctx);
          }
        }
      }
    }
    // Skip: sectPr, bookmarkStart/End
  }

  return { tokens, paragraphStyles };
}

// ── Main export ──────────────────────────────────────────────────────────────

export function parseDocxDirect(arrayBuffer: ArrayBuffer): {
  tokens: WordToken[];
  pageLayout: PageLayout;
  paragraphStyles: Record<number, ParagraphStyle>;
} {
  try {
    const zip = new PizZip(arrayBuffer);
    const docFile = zip.file('word/document.xml');
    if (!docFile) throw new Error('Missing document.xml');

    const xml = new DOMParser().parseFromString(docFile.asText(), 'text/xml');
    const headingMap = buildHeadingMap(zip);
    const themeFonts = buildThemeFonts(zip);
    const styleMap = buildStyleMap(zip, themeFonts);
    const pageLayout = extractPageLayout(xml);
    // Dark launch: with the image fields flag off, the resolver yields no
    // URLs, so no image tokens are emitted anywhere and the editor behaves
    // exactly as before Task 11.
    const media = features.imagePlaceholders ? buildMediaResolver(zip) : () => null;
    const drawingIndex = new Map<Element, number>();
    listDrawingElements(xml).forEach((el, i) => drawingIndex.set(el, i));
    const paraIndex = new Map<Element, number>();
    listParagraphElements(xml).forEach((el, i) => paraIndex.set(el, i));
    const ctx: ParseCtx = { media, drawingIndex, paraIndex };

    const bodies = findAll(xml, 'body');
    if (!bodies[0]) throw new Error('Missing w:body');

    const { tokens, paragraphStyles } = parseBody(bodies[0], headingMap, styleMap, themeFonts, ctx);

    return { tokens, pageLayout, paragraphStyles };
  } catch (e) {
    console.error('docxDirectParser failed:', e);
    return { tokens: [], pageLayout: defaultLayout(), paragraphStyles: {} };
  }
}
