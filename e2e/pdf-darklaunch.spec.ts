import { test, expect } from '@playwright/test';

// Item h: with VITE_CONVERT_API_URL absent (the darklaunch dev server on :5181),
// the done surface renders zero new PDF UI. No Proteus needed.
const DARK = 'http://localhost:5181';

test('h: dark launch (env absent) renders zero new PDF UI on the done surface', async ({ page }) => {
  await page.goto(`${DARK}/dev/pdf-done?n=12`);

  // The existing Word done surface renders (today's app): Download Word files + Start Over.
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Start Over' })).toBeVisible();

  // Fix 1 reference: the OFF-path Download Word files is the brand periwinkle. The ON-path
  // entry primary (pdf-flow spec) is asserted against the same token, so they match.
  const offPrimaryBg = await page
    .getByRole('button', { name: 'Download Word files' })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(offPrimaryBg).toBe('rgb(85, 102, 196)');

  // None of the PDF additions exist.
  await expect(page.getByTestId('pdf-create')).toHaveCount(0);
  await expect(page.getByTestId('pdf-privacy')).toHaveCount(0);
  await expect(page.getByTestId('pdf-files')).toHaveCount(0);
  await expect(page.getByTestId('pdf-convert-count')).toHaveCount(0);

  await page.screenshot({ path: 'e2e/screenshots/h-darklaunch.png', fullPage: true });
});
