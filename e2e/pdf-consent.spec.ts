import { test, expect, type Page } from '@playwright/test';
import { seedDoneOn } from './helpers';

// Pre-conversion consent gate (veidne-pdf-consent-wireframe.html): a consent
// step sits between choosing PDF on the finished screen and anything being sent.
// No request to the converter fires until the user picks Convert. Proteus mode
// is irrelevant here; the batch POST firing (not its result) is what matters.

// Count POSTs to /v1/batches so we can assert none fire while the gate is shown.
function trackBatchPosts(page: Page): () => number {
  let posts = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/v1/batches')) posts += 1;
  });
  return () => posts;
}

const SEND_PHASE = /^(sending|queued|converting|done)$/;

test('gate: no remembered consent shows the gate, fires zero batch requests, focuses the heading; Convert proceeds', async ({ page }) => {
  const batchPosts = trackBatchPosts(page);
  await seedDoneOn(page, 6, { grantConsent: false });

  await page.getByTestId('pdf-create').click();
  const flow = page.getByTestId('pdf-flow');
  await expect(flow).toHaveAttribute('data-phase', 'consent');

  // Copy matches the wireframe exactly.
  await expect(flow).toContainText('Before you continue');
  await expect(flow.getByRole('heading')).toHaveText('Creating a PDF uses our server');
  await expect(flow).toContainText('Everything so far has run in your browser. Creating a PDF is the one step that needs a server.');
  await expect(flow).toContainText("Your documents are sent to Veidne's own server in Germany (EU)");
  await expect(page.getByTestId('pdf-consent-convert')).toHaveText('Convert to PDF');
  await expect(page.getByTestId('pdf-consent-decline')).toHaveText('Keep Word files');
  await expect(page.getByTestId('pdf-consent-remember')).not.toBeChecked(); // unchecked by default

  // Start Over is hidden on the consent gate: only the two decision buttons show
  // (the donate card and review ask are hidden there too).
  await expect(page.getByRole('button', { name: 'Start Over' })).toHaveCount(0);

  // Focus lands on the consent heading on mount.
  await expect
    .poll(() => flow.getByRole('heading').evaluate((el) => el === document.activeElement))
    .toBe(true);

  await page.screenshot({ path: 'e2e/screenshots/consent.png', fullPage: true });

  // Nothing has been sent while the gate is up.
  expect(batchPosts()).toBe(0);

  // Convert (checkbox left unchecked) proceeds to the send and fires the batch.
  await page.getByTestId('pdf-consent-convert').click();
  await expect(flow).toHaveAttribute('data-phase', SEND_PHASE, { timeout: 15_000 });
  await expect.poll(batchPosts).toBeGreaterThanOrEqual(1);

  // Unchecked: consent is not remembered.
  const flag = await page.evaluate(() => localStorage.getItem('veidne.pdfConsent'));
  expect(flag).toBeNull();
});

test('decline: Keep Word files returns to the finished screen with no request, and the gate shows again next time', async ({ page }) => {
  const batchPosts = trackBatchPosts(page);
  await seedDoneOn(page, 6, { grantConsent: false });

  await page.getByTestId('pdf-create').click();
  const flow = page.getByTestId('pdf-flow');
  await expect(flow).toHaveAttribute('data-phase', 'consent');

  await page.getByTestId('pdf-consent-decline').click();
  await expect(flow).toHaveAttribute('data-phase', 'idle');

  // Finished screen intact: Word download and the Create PDFs entry are present.
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible();
  await expect(page.getByTestId('pdf-create')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Over' })).toBeVisible();
  expect(batchPosts()).toBe(0);

  // No decision was recorded: nothing in storage, and the gate shows again.
  expect(await page.evaluate(() => localStorage.getItem('veidne.pdfConsent'))).toBeNull();
  await page.getByTestId('pdf-create').click();
  await expect(flow).toHaveAttribute('data-phase', 'consent');
  expect(batchPosts()).toBe(0);
});

test('remember: Convert with "Don\'t ask again" persists consent; a later export skips the gate and sends directly', async ({ page }) => {
  const batchPosts = trackBatchPosts(page);
  await seedDoneOn(page, 3, { grantConsent: false });

  await page.getByTestId('pdf-create').click();
  const flow = page.getByTestId('pdf-flow');
  await expect(flow).toHaveAttribute('data-phase', 'consent');

  await page.getByTestId('pdf-consent-remember').check();
  await page.getByTestId('pdf-consent-convert').click();
  await expect(flow).toHaveAttribute('data-phase', SEND_PHASE, { timeout: 15_000 });

  // The flag is persisted.
  expect(await page.evaluate(() => localStorage.getItem('veidne.pdfConsent'))).toBe('granted');

  // A fresh export (re-seed; the dev route resets the store, localStorage persists)
  // skips the gate entirely and goes straight to the send.
  await page.goto('/dev/pdf-done?n=3');
  await expect(page.getByTestId('pdf-create')).toBeVisible({ timeout: 30_000 });
  const before = batchPosts();

  await page.getByTestId('pdf-create').click();
  // The gate never renders.
  await expect(page.getByTestId('pdf-consent-convert')).toHaveCount(0);
  await expect(flow).toHaveAttribute('data-phase', SEND_PHASE, { timeout: 15_000 });
  await expect.poll(batchPosts).toBeGreaterThan(before);
});
