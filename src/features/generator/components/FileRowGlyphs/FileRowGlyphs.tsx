// The two glyphs of a file row, from the design mockup: a document outline on
// the left (Word blue) and a download arrow on the right (grey, brand on
// hover). Inline so the strokes match the mockup exactly.

export function DocumentGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 2.5h7l4 4v11a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M11.5 2.5v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** The PDF counterpart: the same outline in PDF red, with a filled band in
 *  place of the text lines. */
export function PdfGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 2.5h7l4 4v11a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M11.5 2.5v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="6.5" y="10.5" width="7" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

export function DownloadGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2.5v9M5.5 8.5 9 12l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13.5v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
