import {
  FORMAT_CONVENTIONS_KEY,
  guessFormatConventions,
  parseStoredFormatConventions,
  serializeFormatConventions,
  type FormatConventions,
} from './localeFormats';

// Browser side of the date and number style: the remembered choice and the
// guess. Everything stays in this browser; nothing here is sent anywhere.
// localStorage can throw (private mode, storage full) and does not exist
// during the prerender, so every access is guarded and a failure means
// "nothing remembered".

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

function browserTimeZone(): string | undefined {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
}

/** The style chosen earlier in this browser, if any. */
export function loadFormatConventions(): FormatConventions | null {
  try { return parseStoredFormatConventions(localStorage.getItem(FORMAT_CONVENTIONS_KEY)); } catch { return null; }
}

/** Remember an explicit choice. Only called when the user changes it. */
export function saveFormatConventions(c: FormatConventions): void {
  try { localStorage.setItem(FORMAT_CONVENTIONS_KEY, serializeFormatConventions(c)); } catch { /* not remembered */ }
}

/** The stored text as it is (null when nothing is stored), so that a
 *  cancelled change in the column dialog can put it back unchanged. */
export function storedFormatConventionsRaw(): string | null {
  try { return localStorage.getItem(FORMAT_CONVENTIONS_KEY); } catch { return null; }
}

export function restoreStoredFormatConventionsRaw(raw: string | null): void {
  try {
    if (raw === null) localStorage.removeItem(FORMAT_CONVENTIONS_KEY);
    else localStorage.setItem(FORMAT_CONVENTIONS_KEY, raw);
  } catch { /* nothing to put back */ }
}

/** The remembered choice, else the guess from the browser language list. */
export function initialFormatConventions(): FormatConventions {
  return loadFormatConventions() ?? guessFormatConventions(browserLanguages(), browserTimeZone());
}
