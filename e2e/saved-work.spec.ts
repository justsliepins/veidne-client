import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

// Work package 1 (homepage audit finding 21): the hero's primary button opens
// /editor without a flow parameter, so a returning visitor's saved work is kept
// and the resume screen appears instead of an empty upload step.
const BASE = 'http://localhost:5181';
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');

test('the hero button keeps a returning visitor\'s saved work and shows the resume screen', async ({ page }) => {
  await page.goto(`${BASE}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await expect(page.getByRole('button', { name: 'Add your data' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('veidne_session') !== null), { timeout: 10_000 }).toBe(true);

  await page.goto(`${BASE}/`);
  const primary = page.getByRole('main').locator('a[href="/editor"]').first();
  await expect(primary).toBeVisible();
  await primary.click();
  await expect(page.getByText('You have an unfinished project')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('veidne_session') !== null)).toBe(true);
});
