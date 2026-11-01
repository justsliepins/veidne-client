import { create } from 'zustand';

// The visitor's choice about the statistics cookie (work package 14).
// Strictly necessary values (the unfinished project, settings the visitor
// chose, hints already seen) need no consent and are not affected.
//
// Without consent, Veidne stores nothing for statistics on the device: the
// server sets no veidne_uid cookie and the browser keeps no first-visit
// attribution. Usage events are still sent, without any identifier, so the
// totals (such as the number of documents made) stay complete.
//
// The choice itself is kept in localStorage (veidne_consent), because
// remembering a refusal is needed to stop asking. It is asked again after 12
// months, for a refusal as well as for consent.

export type ConsentChoice = 'granted' | 'denied' | null;

export const CONSENT_KEY = 'veidne_consent';
// Kept only with consent: removed when the visitor refuses, and whenever a
// page loads without a valid choice (a visitor from before the banner, or a
// choice older than 12 months).
const STATISTICS_KEYS = ['veidne_first_touch'];
// Written by earlier versions and no longer used: removed on every load.
const RETIRED_KEYS = ['veidne_generatedTotal'];

function removeKeys(keys: string[]): void {
  try { keys.forEach((key) => localStorage.removeItem(key)); } catch { /* storage unavailable */ }
}
const VALID_MS = 365 * 24 * 60 * 60 * 1000;

function readChoice(): ConsentChoice {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { v?: number; statistics?: unknown; at?: unknown };
    if (v.v !== 1 || typeof v.statistics !== 'boolean' || typeof v.at !== 'number') return null;
    if (Date.now() - v.at > VALID_MS) return null;
    return v.statistics ? 'granted' : 'denied';
  } catch {
    return null;
  }
}

interface ConsentState {
  choice: ConsentChoice;
  /** The banner is on screen: no valid choice yet, or the visitor asked to change it. */
  open: boolean;
  /** Opened from "Change your cookie choice": the banner takes focus. */
  reopened: boolean;
  choose: (statistics: boolean) => void;
  reopen: () => void;
  /** Closes a reopened banner without changing the choice. */
  dismiss: () => void;
}

// Read at module load in the browser only. The prerender runs without a
// window, so the static HTML never contains the banner.
const initial: ConsentChoice = typeof window === 'undefined' ? null : readChoice();
if (typeof window !== 'undefined') removeKeys(initial === 'granted' ? RETIRED_KEYS : [...RETIRED_KEYS, ...STATISTICS_KEYS]);

export const useConsentStore = create<ConsentState>((set) => ({
  choice: initial,
  open: typeof window !== 'undefined' && initial === null,
  reopened: false,
  choose: (statistics) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, statistics, at: Date.now() }));
    } catch { /* the choice still applies for this visit */ }
    if (!statistics) removeKeys(STATISTICS_KEYS);
    set({ choice: statistics ? 'granted' : 'denied', open: false, reopened: false });
  },
  reopen: () => set({ open: true, reopened: true }),
  dismiss: () => set((st) => (st.choice === null ? st : { open: false, reopened: false })),
}));

// A choice made in another tab (the banner's link opens the privacy notice in
// one) applies here too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CONSENT_KEY) return;
    const next = readChoice();
    useConsentStore.setState(next === null ? { choice: null, open: true, reopened: false } : { choice: next, open: false, reopened: false });
  });
}

/** The value of the X-Veidne-Consent header for API calls that may use the
 *  statistics cookie: "statistics" after consent, "none" after a refusal
 *  (the server then removes an old cookie), nothing before a choice. */
export function consentHeader(): 'statistics' | 'none' | null {
  const c = useConsentStore.getState().choice;
  return c === 'granted' ? 'statistics' : c === 'denied' ? 'none' : null;
}

export const statisticsAllowed = (): boolean => useConsentStore.getState().choice === 'granted';
