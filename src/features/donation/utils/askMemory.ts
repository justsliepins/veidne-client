// What this browser remembers about the donation ask. Everything stays in
// localStorage and is never sent anywhere. localStorage can throw (private
// mode, storage full), so every access is guarded and a failure means
// "nothing remembered".

const DONATED_AT = 'veidne_donatedAt';
const DECLINED_AT = 'veidne_askDeclinedAt';
const DONATE_FROM = 'veidne_donateFrom';

const DAY = 24 * 60 * 60 * 1000;
/** After a donation, the ask is replaced by a thank-you line for this long. */
export const DONOR_QUIET_DAYS = 180;
/** After "No thanks", the dialog stays away this long. Closing it another way
 *  (the X, Escape, a click outside) closes it for the current run only. The
 *  quiet inline line remains either way, so the option never disappears. */
export const DECLINE_QUIET_DAYS = 30;

function read(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function write(key: string, value: number): void {
  try { localStorage.setItem(key, String(value)); } catch { /* not remembered */ }
}

function within(key: string, days: number): boolean {
  const at = read(key);
  return at !== null && Date.now() - at < days * DAY;
}

export const isRecentDonor = () => within(DONATED_AT, DONOR_QUIET_DAYS);
export const rememberDonation = () => write(DONATED_AT, Date.now());
export const isRecentlyDeclined = () => within(DECLINED_AT, DECLINE_QUIET_DAYS);
export const rememberDecline = () => write(DECLINED_AT, Date.now());

/** Set when checkout starts from the Done screen in a new tab, so the
 *  thank-you page only says "your documents are still open in the other tab"
 *  when that is true. Valid for an hour. */
export const rememberDonateFromDone = () => write(DONATE_FROM, Date.now());
export function forgetDonateFromDone(): void {
  try { localStorage.removeItem(DONATE_FROM); } catch { /* nothing to forget */ }
}
export function cameFromDoneTab(): boolean {
  const at = read(DONATE_FROM);
  return at !== null && Date.now() - at < 60 * 60 * 1000;
}
