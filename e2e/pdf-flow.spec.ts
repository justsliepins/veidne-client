import { test, expect } from '@playwright/test';
import { seedDoneOn, rowStems, rowStatuses, convertedCount } from './helpers';

// Items a (walk sending -> converting -> done, count updates, order stable) and
// b (extension flips .docx -> .pdf on done). Requires Proteus in delay mode so
// the converting state is observable.

test('a + b: entry -> sending -> converting -> done, stable order, count updates, extension flips', async ({ page }) => {
  await seedDoneOn(page, 12);

  // --- entry: Word primary stays, Create PDFs beside it, privacy note, all waiting
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible();
  await expect(page.getByTestId('pdf-create')).toHaveText('Create PDFs');
  await expect(page.getByTestId('pdf-privacy')).toBeVisible();
  expect(await rowStatuses(page)).toEqual(Array(12).fill('waiting'));
  // F8: nothing is converting yet, so no per-row status indicator shows at the
  // entry; the files list with names only until Create PDFs starts a batch.
  await expect(page.locator('[data-testid="pdf-row-icon"]')).toHaveCount(0);
  // (b) a row reads .docx while waiting
  await expect(page.locator('[data-stem="Doc_1"] [data-testid="pdf-row-ext"]')).toHaveText('.docx');

  // Fix 1: the entry Word primary uses the brand periwinkle, same as the OFF-path
  // Download Word files (asserted against the brand token; the OFF path is checked in
  // the dark-launch spec).
  const entryPrimaryBg = await page
    .getByRole('button', { name: 'Download Word files' })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(entryPrimaryBg).toBe('rgb(85, 102, 196)');

  // Fix 2: capture the file panel width at entry to compare across phases.
  const widthEntry = (await page.getByTestId('pdf-files').boundingBox())!.width;
  await page.screenshot({ path: 'e2e/screenshots/a-entry.png', fullPage: true });

  // Hold the submit so the brief "sending" state is observable.
  await page.route('**/v1/batches', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  await page.getByTestId('pdf-create').click();

  // seedDoneOn granted consent, so the consent gate is skipped and the flow goes
  // straight to the send (the dedicated gate behavior is covered in pdf-consent).
  await expect(page.getByTestId('pdf-consent-convert')).toHaveCount(0);

  // --- sending
  await expect(page.getByRole('heading', { name: 'Sending your documents' })).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: 'e2e/screenshots/a-sending.png', fullPage: true });

  // --- converting
  await expect(page.getByRole('heading', { name: 'Converting to PDF' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('pdf-convert-count')).toBeVisible();
  const orderAtStart = await rowStems(page);
  expect(orderAtStart).toEqual(Array.from({ length: 12 }, (_, i) => `Doc_${i + 1}`));
  const widthConverting = (await page.getByTestId('pdf-files').boundingBox())!.width;
  await page.screenshot({ path: 'e2e/screenshots/a-converting.png', fullPage: true });

  // count line increases across polls (never decreases)
  const c1 = await convertedCount(page);
  await page.waitForTimeout(2200);
  const c2 = await convertedCount(page);
  expect(c1).toBeGreaterThanOrEqual(0);
  expect(c2).toBeGreaterThanOrEqual(c1);

  // order is unchanged across polls mid-run
  expect(await rowStems(page)).toEqual(orderAtStart);

  // --- done
  await expect(page.getByRole('heading', { name: '12 PDFs ready' })).toBeVisible({ timeout: 30_000 });
  expect(await rowStatuses(page)).toEqual(Array(12).fill('done'));
  expect(await rowStems(page)).toEqual(orderAtStart); // order still stable at completion
  // (b) extension flipped to .pdf on done
  await expect(page.locator('[data-stem="Doc_1"] [data-testid="pdf-row-ext"]')).toHaveText('.pdf');
  await page.screenshot({ path: 'e2e/screenshots/a-done.png', fullPage: true });
  await page.screenshot({ path: 'e2e/screenshots/b-extension-flip.png', fullPage: true });

  // Fix 2: the panel width is constant across entry, converting, and done.
  const widthDone = (await page.getByTestId('pdf-files').boundingBox())!.width;
  expect(Math.abs(widthConverting - widthEntry)).toBeLessThanOrEqual(1);
  expect(Math.abs(widthDone - widthEntry)).toBeLessThanOrEqual(1);
});
