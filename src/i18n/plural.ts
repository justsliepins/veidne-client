import { t } from './i18n';

/** Central count phrasing. Every user-facing count string goes through here:
 *  keys come in pairs, <base>.one for exactly 1 and <base>.many otherwise,
 *  both receiving {count}. */
export function tCount(count: number, baseKey: string): string {
  return t(count === 1 ? `${baseKey}.one` : `${baseKey}.many`, { count: String(count) });
}
