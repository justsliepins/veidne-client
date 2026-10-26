import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

// One-click instant result entry (/editor?flow=instant&src=hero_mockup|matrix): the
// merged preview of the sample document loads with no demo coach and no asset
// network calls, sample generations are flagged in analytics, and "Use my
// files" swaps to the normal upload flow.
//
// Analytics is intercepted in every test (capture + fulfill 200) so the suite
// is hermetic; the dark-launch server (:5181) keeps the done surface on the
// classic Word file list.
const BASE = 'http://localhost:5181';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');
const DATA = path.join(FIXTURES, 'veidne-format-test-data.xlsx');

const BANNER = 'This is sample data. Replace it with your files to create your own documents.';

interface CapturedEvent {
  event: string;
  data?: Record<string, unknown>;
}

async function interceptAnalytics(page: Page): Promise<CapturedEvent[]> {
  const events: CapturedEvent[] = [];
  await page.route('**/api/analytics', async (route) => {
    events.push(route.request().postDataJSON() as CapturedEvent);
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return events;
}

function ofType(events: CapturedEvent[], type: string): CapturedEvent[] {
  return events.filter((e) => e.event === type);
}

test('homepage mockup card opens the instant preview fast, pages records, fires opened once', async ({ page }) => {
  const events = await interceptAnalytics(page);

  // Warm the lazy /editor chunk so the 3s budget measures the app, not the
  // dev server's first-hit TypeScript transform (production serves it prebuilt).
  await page.goto(`${BASE}/editor`);
  await expect(page.getByText('Drag and drop your Word document or template here')).toBeVisible();

  await page.goto(`${BASE}/`);
  await page.getByRole('button', { name: 'Open a finished example' }).click();

  await expect(page.getByText(BANNER, { exact: true })).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('document-area')).toContainText('Dear Emily Rodriguez', { timeout: 3000 });

  // Record paging works (24 sample rows).
  await page.getByText('1 of 24', { exact: true }).locator('..').locator('button').nth(1).click();
  await expect(page.getByTestId('document-area')).toContainText('Marcus Chen');
  await page.getByText('2 of 24', { exact: true }).locator('..').locator('button').nth(0).click();
  await expect(page.getByTestId('document-area')).toContainText('Emily Rodriguez');

  await expect.poll(() => ofType(events, 'instant_preview_opened').length).toBe(1);
  expect(ofType(events, 'instant_preview_opened')[0].data).toEqual({ source: 'hero_mockup' });
  expect(ofType(events, 'demo_started')).toHaveLength(0);
});

test('hero mockup card activates by keyboard', async ({ page }) => {
  const events = await interceptAnalytics(page);
  await page.goto(`${BASE}/`);

  const card = page.getByRole('button', { name: 'Open a finished example' });
  await card.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText(BANNER, { exact: true })).toBeVisible();
  await expect(page.getByTestId('document-area')).toContainText('Dear Emily Rodriguez');
  await expect.poll(() => ofType(events, 'instant_preview_opened').length).toBe(1);
  expect(ofType(events, 'instant_preview_opened')[0].data).toEqual({ source: 'hero_mockup' });
});

test('Use my files swaps to the upload step and the real flow stays unflagged', async ({ page }) => {
  const events = await interceptAnalytics(page);
  await page.goto(`${BASE}/editor?flow=instant&src=hero_mockup`);
  await expect(page.getByText(BANNER, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Use my files' }).click();
  await expect.poll(() => ofType(events, 'instant_preview_swapped').length).toBe(1);
  await expect(page.getByText('Drag and drop your Word document or template here')).toBeVisible();

  // Normal flow with real fixtures reaches a real, unbannered preview.
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(DATA);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('document-area')).toContainText('Anna Ozola');
  await expect(page.getByText(BANNER, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });

  await expect.poll(() => ofType(events, 'generate_completed').length).toBe(1);
  const completed = ofType(events, 'generate_completed')[0];
  expect(completed.data).toHaveProperty('count', '3');
  expect(completed.data).not.toHaveProperty('sample');
});

test('the upload step sample-data link opens the instant preview with its own attribution', async ({ page }) => {
  const events = await interceptAnalytics(page);
  // /start redirects to the upload step; the matrix is gone.
  await page.goto(`${BASE}/start`);
  await expect(page).toHaveURL(/\/editor$/);
  await page.getByRole('button', { name: 'Try it with sample data' }).click();

  await expect(page.getByText(BANNER, { exact: true })).toBeVisible();
  await expect(page.getByTestId('document-area')).toContainText('Dear Emily Rodriguez');

  await expect.poll(() => ofType(events, 'instant_preview_opened').length).toBe(1);
  expect(ofType(events, 'instant_preview_opened')[0].data).toEqual({ source: 'start_upload' });
  expect(ofType(events, 'matrix_selection')).toHaveLength(0);
});

test('generating from the instant preview flags both generate events as sample', async ({ page }) => {
  const events = await interceptAnalytics(page);
  await page.goto(`${BASE}/editor?flow=instant&src=hero_mockup`);
  await expect(page.getByText(BANNER, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });

  await expect.poll(() => ofType(events, 'generate_started').length).toBe(1);
  expect(ofType(events, 'generate_started')[0].data).toEqual({ sample: true });
  await expect.poll(() => ofType(events, 'generate_completed').length).toBe(1);
  expect(ofType(events, 'generate_completed')[0].data).toEqual({ count: '24', sample: true });
});
