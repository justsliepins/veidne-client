// Reads a custom donation amount the way people type it. The field keeps
// exactly what was typed; spaces and an "EUR" or euro sign before or after
// the number are ignored. Only a whole number of euros, 1 or more, is an
// amount: "2,50" or "7.5" is not read as 250 or 75 (review a, finding 5).
export function parseWholeEuros(text: string): number | null {
  const t = text.replace(/[\s\u00a0]+/g, '').replace(/^(eur|\u20ac)/i, '').replace(/(eur|\u20ac)$/i, '');
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}
