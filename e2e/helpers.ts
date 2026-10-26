import { type Page, expect } from '@playwright/test';

const PDF_CONSENT_KEY = 'veidne.pdfConsent';

/** Pre-grant the PDF consent flag so the consent gate is skipped (the default for
 *  conversion specs). Registered as an init script so it is set before app code
 *  reads it on every navigation in this context. */
export async function grantPdfConsent(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, 'granted');
    } catch {
      /* private mode: ignore */
    }
  }, PDF_CONSENT_KEY);
}

// Seed the dev-only done surface with N generated documents (feature ON server)
// and wait until the PDF entry has rendered (generation finished). Consent is
// granted by default so existing specs reach the send directly; pass
// { grantConsent: false } to exercise the pre-conversion consent gate.
export async function seedDoneOn(page: Page, n: number, opts?: { grantConsent?: boolean }): Promise<void> {
  if (opts?.grantConsent ?? true) await grantPdfConsent(page);
  await page.goto(`/dev/pdf-done?n=${n}`);
  await expect(page.getByTestId('pdf-create')).toBeVisible({ timeout: 30_000 });
}

export function rowStems(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid="pdf-row"]', (els) =>
    els.map((e) => e.getAttribute('data-stem') || ''),
  );
}

export function rowStatuses(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid="pdf-row"]', (els) =>
    els.map((e) => e.getAttribute('data-status') || ''),
  );
}

// Parse the "X of N converted" count line into X (completed count).
export async function convertedCount(page: Page): Promise<number> {
  const text = (await page.getByTestId('pdf-convert-count').textContent()) || '';
  const m = text.match(/(\d+)\s+of\s+(\d+)/);
  return m ? Number(m[1]) : -1;
}
