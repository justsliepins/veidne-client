export interface WordToken {
  id: string;
  text: string;
  type: 'word' | 'space' | 'newline' | 'pageBreak' | 'image' | 'htmlBlock' | 'unsupported';
  paragraphIndex: number;
  /** Image tokens only: text holds the object URL; the fields below carry the
   *  drawing's identity so later steps can tag and swap it. */
  imageEmuW?: number;
  imageEmuH?: number;
  imageName?: string;
  imageDescr?: string;
  imageRelId?: string;
  /** Ordinal of this drawing among all drawing/pict/object elements in the
   *  body, in tree order. Lets the XML tagger find the same element again. */
  imageDocIndex?: number;
  /** Word/space tokens only: exact position of this token's text in
   *  document.xml so the template tagger can edit that spot directly.
   *  paraDocIndex/runDocIndex are indexes into the docxAnchors walkers;
   *  charOffset is the offset within the concatenation of that run's direct
   *  <w:t> text. Absent on synthetic tokens (tabs, breaks) and on non-docx
   *  parses — those fall back to text-search tagging. Empty-paragraph
   *  fillers carry paraDocIndex only (see isEmptyParagraphFiller). */
  paraDocIndex?: number;
  runDocIndex?: number;
  charOffset?: number;
  /** Synthetic NBSP rendered for an empty paragraph. Marks the paragraph's
   *  position (paraDocIndex, no run/char — there is no run) but contributes
   *  ZERO text: it is excluded from originalText/covered-text math, and a
   *  multi-paragraph collapse may delete its <w:p> like any other emptied
   *  intermediate paragraph. */
  isEmptyParagraphFiller?: true;
  heading?: number;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  underline?: boolean;
  tableId?: string;
  cellRow?: number;
  cellCol?: number;
  cellRowSpan?: number;
  cellColSpan?: number;
  isTableStart?: boolean;
  tableColWidths?: number[];
}

export interface Placeholder {
  id: string;
  name: string;
  originalText: string;
  colorIndex: number;
  occurrences: string[][];  // array of token ID arrays, one per occurrence
  /** Missing means 'text' (all fields predate the image type). Image fields
   *  live as {{NAME}} alt-text tags on drawings, not as document text. */
  type?: 'text' | 'image';
}

export type SelectionState = 'idle' | 'oneWord' | 'rangeSelected';

export interface EditorSnapshot {
  placeholders: Placeholder[];
}

export interface PageLayout {
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface ParagraphStyle {
  fontSize?: number;
  spacingBefore?: number;
  spacingAfter?: number;
  lineHeight?: number;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  indentLeft?: number;
  indentFirstLine?: number;
}
