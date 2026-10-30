import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type { Placeholder } from '@/features/editor/utils/types';
import { swapImagesInZip, type ImageFieldSwap } from './imageSwap';

/**
 * Thrown when docxtemplater cannot compile or render the template. Carries a
 * stable code so the UI can surface a friendly message instead of a raw
 * TemplateError dump.
 */
export class DocumentGenerationError extends Error {
  constructor(cause?: unknown) {
    super('document_generation_failed');
    this.name = 'DocumentGenerationError';
    this.cause = cause;
  }
}

/** The parts of a docxtemplater error worth showing or recording. */
export interface TemplateErrorInfo {
  /** Stable docxtemplater code, e.g. closing_tag_does_not_match_opening_tag. */
  id: string;
  /** The library's own sentence about what is wrong. */
  explanation: string;
  /** Zip part the error was found in, e.g. word/document.xml or word/header1.xml. */
  file: string;
  /** The offending tag text when the error names one, otherwise empty. */
  tag: string;
}

/** Thrown at upload when the template will not compile; carries the details. */
export class TemplateSyntaxError extends Error {
  readonly info: TemplateErrorInfo;
  constructor(info: TemplateErrorInfo) {
    super('template_syntax');
    this.name = 'TemplateSyntaxError';
    this.info = info;
  }
}

type ErrorProps = Record<string, unknown> & { errors?: { properties?: Record<string, unknown> }[] };

/**
 * Read the first docxtemplater error out of a thrown value. docxtemplater
 * throws a TemplateError whose `properties.errors` lists the individual
 * problems (or a single error whose `properties` is the problem itself); a
 * DocumentGenerationError wraps one as its cause. Anything else yields null.
 */
export function describeTemplateError(e: unknown): TemplateErrorInfo | null {
  const root = e instanceof DocumentGenerationError ? e.cause : e;
  const props = (root as { properties?: ErrorProps } | null)?.properties;
  if (!props || typeof props !== 'object') return null;
  const first = Array.isArray(props.errors) && props.errors.length > 0 ? props.errors[0].properties ?? {} : props;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    id: str(first.id) || 'unknown',
    explanation: str(first.explanation),
    file: str(first.file),
    tag: str(first.xtag) || str(first.closingtag) || str(first.openingtag),
  };
}

/** One line for the console, so a bug report has something to quote. */
export function templateErrorSummary(e: unknown): string {
  const info = describeTemplateError(e);
  if (info) return `${info.id}${info.file ? ` in ${info.file}` : ''}${info.explanation ? `: ${info.explanation}` : ''}`;
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

// Private-use code points stand in for literal braces that belong to the
// document content (embedded JSON, Python, etc.) while docxtemplater scans the
// file. They never occur in real text, so they survive the render untouched
// and are swapped back to real braces in the output.
const SENT_OPEN = '\uE000';
const SENT_CLOSE = '\uE001';
// Marker wrapping a protected placeholder while neighbouring braces are
// neutralized, then unwrapped before rendering.
const MARK = '\uF8FF';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Neutralize every brace in the document text except the placeholders Veidne
 * injected ({{Name}} for each known field). Incidental braces in the document
 * body, including coincidentally well-formed {{x}} that is not a real field,
 * become sentinels so docxtemplater treats them as plain text. Only the genuine
 * placeholders remain as template tags.
 */
function neutralizeIncidentalBraces(xml: string, placeholderNames: string[]): string {
  const names = placeholderNames.filter(Boolean);
  // Longest first so a name that is a prefix of another does not match early.
  const sorted = [...new Set(names)].sort((a, b) => b.length - a.length);
  const tagPattern = sorted.length
    ? new RegExp(`\\{\\{(?:${sorted.map(escapeRegExp).join('|')})\\}\\}`, 'g')
    : null;

  return xml.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, (_, open, text, close) => {
    const protectedTags: string[] = [];
    let s: string = text;
    if (tagPattern) {
      s = s.replace(tagPattern, (m: string) => `${MARK}${protectedTags.push(m) - 1}${MARK}`);
    }
    s = s.replace(/\{/g, SENT_OPEN).replace(/\}/g, SENT_CLOSE);
    s = s.replace(new RegExp(`${MARK}(\\d+)${MARK}`, 'g'), (_m, i) => protectedTags[Number(i)]);
    return open + s + close;
  });
}

/** Swap the neutralized brace sentinels back to literal braces in the output. */
function restoreLiteralBraces(xml: string): string {
  return xml
    .replace(new RegExp(SENT_OPEN, 'g'), '{')
    .replace(new RegExp(SENT_CLOSE, 'g'), '}');
}

/** docxtemplater over an already neutralized zip, with Veidne's settings. */
function compileTemplate(zip: PizZip): Docxtemplater {
  return new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
    delimiters: { start: '{{', end: '}}' },
    // Defence in depth: should a stray delimiter ever slip past neutralization,
    // render it as literal text rather than throwing.
    syntax: { allowUnopenedTag: true, allowUnclosedTag: true },
    // Keep raw TemplateError objects out of the console; the caller logs one
    // summary line and surfaces a friendly message.
    errorLogging: false,
  });
}

function neutralizedZip(taggedDocxBytes: ArrayBuffer, placeholders: Placeholder[]): PizZip {
  const zip = new PizZip(taggedDocxBytes);
  const docFile = zip.file('word/document.xml');
  if (docFile) {
    // Image field tags live in drawing alt text, never in w:t content, so
    // only text field names take part in brace protection.
    const names = placeholders.filter((p) => p.type !== 'image').map((p) => p.name);
    zip.file('word/document.xml', neutralizeIncidentalBraces(docFile.asText(), names));
  }
  return zip;
}

/**
 * Compile a tagged template exactly as generateDocument would, without
 * rendering. Returns the first problem docxtemplater reports, or null when
 * the template compiles. Used at upload so a template the generator will
 * reject is refused before the user invests in data mapping.
 */
export function checkTemplateCompiles(taggedDocxBytes: ArrayBuffer, placeholders: Placeholder[]): TemplateErrorInfo | null {
  try {
    compileTemplate(neutralizedZip(taggedDocxBytes, placeholders));
    return null;
  } catch (e) {
    return describeTemplateError(e) ?? { id: 'unknown', explanation: e instanceof Error ? e.message : String(e), file: '', tag: '' };
  }
}

export function generateDocument(
  taggedDocxBytes: ArrayBuffer,
  rowData: Record<string, string>,
  columnMapping: Record<string, string>,
  placeholders: Placeholder[],
  imageSwaps?: ImageFieldSwap[],
): Blob {
  const zip = neutralizedZip(taggedDocxBytes, placeholders);

  const templateData: Record<string, string> = {};
  const imageFieldNames = new Set(placeholders.filter((p) => p.type === 'image').map((p) => p.name));
  for (const [column, placeholder] of Object.entries(columnMapping)) {
    // Image columns carry file names for the media swap, not text to render.
    if (imageFieldNames.has(placeholder)) continue;
    templateData[placeholder] = rowData[column] ?? '';
  }

  // The constructor compiles every part of the template and is where a
  // malformed tag pair throws, so it sits inside the try with render: the
  // cause travels in the DocumentGenerationError either way.
  let doc: Docxtemplater;
  try {
    doc = compileTemplate(zip);
    doc.render(templateData);
  } catch (e) {
    console.warn(`[documentGenerator] template rejected: ${templateErrorSummary(e)}`);
    throw new DocumentGenerationError(e);
  }

  const out = doc.getZip();
  const outFile = out.file('word/document.xml');
  if (outFile) {
    out.file('word/document.xml', restoreLiteralBraces(outFile.asText()));
  }

  // Image fields (dark-launched): swap each tagged drawing's media on this
  // row's fresh copy. Absent or empty swaps leave the path byte-identical.
  if (imageSwaps && imageSwaps.length > 0) {
    swapImagesInZip(out, imageSwaps);
  }

  return out.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
