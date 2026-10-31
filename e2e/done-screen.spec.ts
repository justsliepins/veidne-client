import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

// Work package 4 (journey audit findings 3, 5, 6, 7, 8, 18): the Done screen
// keeps the work until something is downloaded, the donation dialog opens at
// most once per run and never again for 30 days after "No thanks" or for 180
// days after a donation, and one feedback question with the Trustpilot link
// for everyone replaces the repeated review ask.
// Uses the dev-only seed route, which runs the real generator on 3 fixture rows
// and renders the real DoneView (no PDF feature on the darklaunch server).
const BASE = 'http://localhost:5181';
const DAY = 24 * 60 * 60 * 1000;
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

interface CapturedEvent { event: string; data?: Record<string, unknown> }

async function captureAnalytics(page: Page): Promise<CapturedEvent[]> {
  const events: CapturedEvent[] = [];
  await page.route('**/api/analytics**', async (route) => {
    try {
      const body = route.request().postDataJSON() as CapturedEvent | CapturedEvent[];
      for (const e of Array.isArray(body) ? body : [body]) events.push(e);
    } catch { /* not JSON */ }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return events;
}

async function seedDone(page: Page, storage: Record<string, string> = {}): Promise<void> {
  await page.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries)) {
      try { localStorage.setItem(k, v); } catch { /* ignore */ }
    }
  }, storage);
  await page.goto(`${BASE}/dev/pdf-done?n=3`);
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
}

async function downloadAll(page: Page): Promise<void> {
  const download = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Download Word files' }).click();
  await download;
}

test('before the first download the Done screen says the files are not saved, and Start a new merge asks first', async ({ page }) => {
  const events = await captureAnalytics(page);
  await seedDone(page);
  await expect(page.getByText('Download them before you close this tab. They are not saved anywhere else.')).toBeVisible();

  await page.getByRole('button', { name: 'Start a new merge' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('Nothing has been downloaded yet. If you go on, these 3 documents are gone.');
  await expect(confirm.getByRole('button', { name: 'Keep them' })).toBeFocused();
  await expect(confirm.getByRole('button', { name: 'Discard 3 documents' })).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep them' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible();
  expect(events.filter((e) => e.event === 'start_over')).toHaveLength(0);

  // Leaving the tab before any download asks the browser to confirm.
  let sawBeforeUnload = false;
  page.on('dialog', async (d) => {
    if (d.type() === 'beforeunload') sawBeforeUnload = true;
    await d.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => sawBeforeUnload).toBe(true);
});

test('the donation dialog opens once after the first download; No thanks keeps it away and the quiet line stays', async ({ page }) => {
  const events = await captureAnalytics(page);
  await seedDone(page);
  await downloadAll(page);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Veidne is free and runs on donations' })).toBeFocused();
  await expect(dialog).toContainText('3 documents saved');
  await expect(dialog.getByText(/Trustpilot/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect(page.getByText('Veidne is free and runs on donations.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Support Veidne' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('veidne_askDeclinedAt'))).not.toBeNull();
  await expect.poll(() => events.filter((e) => e.event === 'donation_ask_dismissed').map((e) => e.data)).toEqual([{ method: 'no_thanks', surface: 'modal' }]);

  // A second download in the same run does not open the dialog again.
  await downloadAll(page);
  await page.waitForTimeout(5000);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // One feedback question, with the Trustpilot link shown whatever the answer.
  await expect(page.getByText('Did the documents come out right?')).toBeVisible();
  const trustpilot = page.getByRole('link', { name: /Trustpilot/ });
  await expect(trustpilot).toBeVisible();
  await page.getByRole('button', { name: 'Not quite' }).click();
  await expect(page.getByText('Some fields are empty')).toBeVisible();
  await expect(trustpilot).toBeVisible();
  await expect.poll(() => events.filter((e) => e.event === 'feedback_answered').map((e) => e.data)).toEqual([{ answer: 'not_quite' }]);
});

test('a recent "No thanks" keeps the dialog closed in the next run; after 30 days it opens again', async ({ page, context }) => {
  await seedDone(page, { veidne_askDeclinedAt: String(Date.now() - 1 * DAY) });
  await downloadAll(page);
  await page.waitForTimeout(1500);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const later = await context.newPage();
  await seedDone(later, { veidne_askDeclinedAt: String(Date.now() - 31 * DAY) });
  await downloadAll(later);
  await expect(later.getByRole('dialog')).toBeVisible();
});

test('a recent donor sees a thank-you line instead of the ask', async ({ page }) => {
  await seedDone(page, { veidne_donatedAt: String(Date.now() - 10 * DAY) });
  await downloadAll(page);
  await page.waitForTimeout(1500);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Thank you for supporting Veidne.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Give again' })).toBeVisible();
});

test('after a download, Start a new merge needs no confirmation and records start_over', async ({ page }) => {
  const events = await captureAnalytics(page);
  await seedDone(page, { veidne_askDeclinedAt: String(Date.now()) });
  await downloadAll(page);
  await page.getByRole('button', { name: 'Start a new merge' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect.poll(() => events.filter((e) => e.event === 'start_over').map((e) => e.data)).toEqual([{ downloaded: true, keep: 'none' }]);
});

// A real run through the editor (the seed route renders DoneView without the
// editor around it, so it has no template link and no router blocker).
async function runToDone(page: Page): Promise<void> {
  await page.goto(`${BASE}/start`);
  await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, 'veidne-format-test-template.docx'));
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, 'veidne-locale-formats.xlsx'));
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Looks good' }).click();
  await page.getByRole('button', { name: /^Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
}

test('the marked template is not a download of the documents: the protection stays', async ({ page }) => {
  await runToDone(page);
  const template = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Template with your fields marked (.docx)' }).click();
  await template;
  await expect(page.getByText('Download them before you close this tab. They are not saved anywhere else.')).toBeVisible();
  await expect(page.getByText('Did the documents come out right?')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start a new merge' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Nothing has been downloaded yet.');
});

test('leaving inside the app before a download asks with the same words, and Cancel keeps the files', async ({ page }) => {
  await runToDone(page);
  let message = '';
  page.once('dialog', async (d) => { message = d.message(); await d.dismiss(); });
  await page.getByRole('banner').getByRole('link').first().click();
  await expect.poll(() => message).toMatch(/^Nothing has been downloaded yet\. If you go on, these \d+ documents are gone\.$/);
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible();
});

test('one file downloaded keeps the protection for the rest, and the dialog counts what was saved', async ({ page }) => {
  await seedDone(page);
  const one = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: /^Download .+\.docx$/ }).first().click();
  await one;
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog).toContainText('1 document saved');
  await dialog.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.getByText('Download them before you close this tab. They are not saved anywhere else.')).toBeVisible();
  await page.getByRole('button', { name: 'Start a new merge' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('Not every document has been downloaded. If you go on, the ones you did not download are gone.');
  await expect(confirm.getByRole('button', { name: 'Discard 2 documents' })).toBeVisible();
});

test('checkout opened from the dialog closes it without a dismissal, and the quiet line stays', async ({ page }) => {
  const events = await captureAnalytics(page);
  await page.route('**/api/donations/create-session', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ sessionUrl: 'https://checkout.example.test/s/1', livemode: false }),
  }));
  // A stand-in for the new tab, so the test never leaves the page.
  await page.addInitScript(() => { window.open = (() => ({ location: { href: '' }, close() { /* none */ } })) as unknown as typeof window.open; });
  await seedDone(page);
  await downloadAll(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Donate 5 EUR' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Support Veidne' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(events.filter((e) => e.event === 'donation_ask_dismissed')).toHaveLength(0);
});

test('focus follows each in-place change on the Done screen', async ({ page }) => {
  await seedDone(page, { veidne_askDeclinedAt: String(Date.now()) });
  // "Keep them" returns focus to the button that asked.
  await page.getByRole('button', { name: 'Start a new merge' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Keep them' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Start a new merge' })).toBeFocused();
  // After a download (recently declined, so no dialog), "Support Veidne" opens
  // the card in its place and focus moves to the card's heading.
  await downloadAll(page);
  await page.getByRole('button', { name: 'Support Veidne' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'You just made 3 documents' })).toBeFocused();
  // "Not quite" is replaced by the answer, which takes focus.
  await page.getByRole('button', { name: 'Not quite' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Thank you. What went wrong?' })).toBeFocused();
});

test('the feedback reasons are independent, each with its help, and one way to write to us', async ({ page }) => {
  await seedDone(page, { veidne_askDeclinedAt: String(Date.now()) });
  await downloadAll(page);
  await page.getByRole('button', { name: 'Not quite' }).click();
  const empty = page.getByRole('button', { name: 'Some fields are empty' });
  const formats = page.getByRole('button', { name: 'Dates or numbers look wrong' });
  await empty.click();
  await formats.click();
  await expect(empty).toHaveAttribute('aria-pressed', 'true');
  await expect(formats).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/This happens when a field has no matching column/)).toBeVisible();
  await expect(page.getByText(/If dates or numbers use the wrong style/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Write to us at info@veidne.com' })).toHaveCount(1);
});

test('a custom amount keeps what was typed and says when it is not whole euros', async ({ page }) => {
  await seedDone(page);
  await page.getByRole('button', { name: /^Other/ }).click();
  const field = page.getByLabel('Amount in euros');
  await field.fill('2,50');
  await expect(field).toHaveValue('2,50');
  await expect(page.getByRole('button', { name: 'Donate', exact: true })).toBeDisabled();
  await field.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Enter the amount in whole euros, for example 5.');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await field.fill('5 EUR');
  await expect(page.getByRole('button', { name: 'Donate 5 EUR' })).toBeEnabled();
});
