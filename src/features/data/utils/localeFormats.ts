// Regional date and number styles (audit nov 2026, finding 2).
//
// Excel shows two kinds of values in the computer's own regional style: the
// built-in "short date" (number format 14, and 22 for date plus time), which
// is what a date typed into Excel gets, and every number separator, because
// Excel replaces the "," and "." of a number format with the system's
// thousands and decimal separators. SheetJS always writes both in US style
// ("11/14/26", "1,234.50"). The user picks the style their Excel shows; this
// module holds the styles and the text transformations. It is pure: no
// browser APIs, no storage and no SheetJS, so Node checks can import it.

export type DateStyle = 'dmy-dot' | 'dmy-dot-end' | 'dmy-slash' | 'mdy-slash' | 'ymd-dash';
export type NumberStyle = 'space-comma' | 'dot-comma' | 'comma-dot';

export interface FormatConventions {
  date: DateStyle;
  number: NumberStyle;
}

/** Display order of the choices (stable, not reordered by the guess). */
export const DATE_STYLES: readonly DateStyle[] = ['dmy-dot', 'dmy-dot-end', 'dmy-slash', 'mdy-slash', 'ymd-dash'];
export const NUMBER_STYLES: readonly NumberStyle[] = ['space-comma', 'dot-comma', 'comma-dot'];

/** SheetJS date code per style. Dots are quoted because SSF 0.18.5 reads an
 *  unquoted dot in a date code as a sub-second token (see excelParser.ts). */
export const DATE_STYLE_CODES: Record<DateStyle, string> = {
  'dmy-dot': 'dd"."mm"."yyyy',
  'dmy-dot-end': 'dd"."mm"."yyyy"."',
  'dmy-slash': 'dd/mm/yyyy',
  'mdy-slash': 'm/d/yyyy',
  'ymd-dash': 'yyyy-mm-dd',
};

/** Time part of built-in format 22 ("short date" plus 24-hour time). */
export const DATE_TIME_SUFFIX = ' h:mm';

/** 14 November 2026 written in each style. The option labels; the Node check
 *  confirms that formatting serial 46340 with DATE_STYLE_CODES gives these. */
export const DATE_STYLE_EXAMPLES: Record<DateStyle, string> = {
  'dmy-dot': '14.11.2026',
  'dmy-dot-end': '14.11.2026.',
  'dmy-slash': '14/11/2026',
  'mdy-slash': '11/14/2026',
  'ymd-dash': '2026-11-14',
};

const NBSP = '\u00A0';

/** Thousands and decimal separator per style. The space is U+00A0, as in the
 *  Latvian regional data of CLDR, so a number never breaks across lines. */
export const NUMBER_SEPARATORS: Record<NumberStyle, { group: string; decimal: string }> = {
  'space-comma': { group: NBSP, decimal: ',' },
  'dot-comma': { group: '.', decimal: ',' },
  'comma-dot': { group: ',', decimal: '.' },
};

// A number as SheetJS writes it: grouped digits with an optional fraction,
// plain digits with a fraction, or a bare fraction. Literal text in a format
// ("No. 5", "kg.") never matches, because a separator must sit next to digits.
const US_NUMBER = /\d{1,3}(?:,\d{3})+(?!\d)(?:\.\d+)?|\d+\.\d+|\.\d+/g;
const US_NUMBER_ONCE = /\d{1,3}(?:,\d{3})+(?!\d)(?:\.\d+)?|\d+\.\d+|\.\d+/;

/** True when SheetJS text for a number carries a thousands or decimal
 *  separator, so it would read differently in another style. */
export function hasNumberSeparators(text: string): boolean {
  return US_NUMBER_ONCE.test(text);
}

/** Rewrite the separators of every number in SheetJS's US-style text. */
export function localizeNumberText(text: string, style: NumberStyle): string {
  if (style === 'comma-dot') return text;
  const { group, decimal } = NUMBER_SEPARATORS[style];
  return text.replace(US_NUMBER, (n) => n.replace(/[.,]/g, (c) => (c === ',' ? group : decimal)));
}

/** 1 234,50 written in each style: the number option labels. */
export function numberStyleExample(style: NumberStyle): string {
  return localizeNumberText('1,234.50', style);
}

export const LATVIAN_CONVENTIONS: FormatConventions = { date: 'dmy-dot', number: 'space-comma' };
export const US_CONVENTIONS: FormatConventions = { date: 'mdy-slash', number: 'comma-dot' };

const GB: FormatConventions = { date: 'dmy-slash', number: 'comma-dot' };
const DOT_SPACE: FormatConventions = { date: 'dmy-dot', number: 'space-comma' };
const DOT_DOT: FormatConventions = { date: 'dmy-dot', number: 'dot-comma' };
const SLASH_DOT: FormatConventions = { date: 'dmy-slash', number: 'dot-comma' };
const SLASH_SPACE: FormatConventions = { date: 'dmy-slash', number: 'space-comma' };
const ISO_SPACE: FormatConventions = { date: 'ymd-dash', number: 'space-comma' };

// Windows' usual short date and separators for a browser language, reduced to
// the styles above. A full tag is looked up before its language. This is a
// guess, not a fact about the user's computer: the choice stays visible.
const BY_TAG: Record<string, FormatConventions> = {
  'en-us': US_CONVENTIONS,
  'en-gb': GB, 'en-ie': GB, 'en-au': GB, 'en-nz': GB, 'en-in': GB,
  'en-ca': { date: 'ymd-dash', number: 'comma-dot' },
  'pt-br': SLASH_DOT,
  'de-ch': { date: 'dmy-dot', number: 'comma-dot' },
};
const BY_LANGUAGE: Record<string, FormatConventions> = {
  en: US_CONVENTIONS,
  lt: ISO_SPACE, sv: ISO_SPACE,
  et: DOT_SPACE, fi: DOT_SPACE, ru: DOT_SPACE, uk: DOT_SPACE, pl: DOT_SPACE, cs: DOT_SPACE, nb: DOT_SPACE, no: DOT_SPACE,
  de: DOT_DOT, tr: DOT_DOT, ro: DOT_DOT,
  fr: SLASH_SPACE, pt: SLASH_SPACE,
  es: SLASH_DOT, it: SLASH_DOT,
};

/**
 * Best guess of the style the user's Excel shows. Many people in Latvia run an
 * English browser on a computer set to Latvian formats, so a Latvian language
 * anywhere in the list, or the Riga time zone, wins over the first language.
 * Otherwise the first language Veidne knows decides; unknown means US.
 */
export function guessFormatConventions(languages: readonly string[], timeZone?: string): FormatConventions {
  const tags = languages.map((l) => l.trim().toLowerCase()).filter(Boolean);
  if (tags.some((tag) => tag === 'lv' || tag.startsWith('lv-')) || timeZone === 'Europe/Riga') return LATVIAN_CONVENTIONS;
  for (const tag of tags) {
    const known = BY_TAG[tag] ?? BY_LANGUAGE[tag.split('-')[0]];
    if (known) return known;
  }
  return US_CONVENTIONS;
}

/** localStorage key for an explicit choice. Never sent anywhere. */
export const FORMAT_CONVENTIONS_KEY = 'veidne_formatConventions';

export function serializeFormatConventions(c: FormatConventions): string {
  return JSON.stringify({ v: 1, date: c.date, number: c.number });
}

/** A stored choice, or null when absent, from another version or corrupt. */
export function parseStoredFormatConventions(raw: string | null): FormatConventions | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { v?: unknown; date?: unknown; number?: unknown };
    if (v && v.v === 1 && DATE_STYLES.includes(v.date as DateStyle) && NUMBER_STYLES.includes(v.number as NumberStyle)) {
      return { date: v.date as DateStyle, number: v.number as NumberStyle };
    }
  } catch { /* corrupt value: treat as nothing stored */ }
  return null;
}
