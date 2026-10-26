import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// F13: the faint text token and the small green status text are darkened to at
// least 4.5:1 on white for sizes under 18px. This spec reads the colors the app
// actually renders and computes the WCAG ratio, so a regression to a lighter
// value fails here rather than only in someone's eyes.
const ON = 'http://localhost:5173';
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE_C = path.join(FIXTURES, 'veidne-image-template-C-pretagged.docx');

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrastOnWhite = (rgb: number[]) => {
  const l = luminance(rgb);
  return (1 + 0.05) / (l + 0.05);
};
const parseRgb = (s: string): number[] => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

test('F13: faint text and green status text meet 4.5:1 on white', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('image-badge')).toBeVisible();

  // Small green status text: the completed step's status on the progress bar.
  const greenColor = await page.getByText('Complete', { exact: true }).first()
    .evaluate((el) => getComputedStyle(el).color);
  const greenRgb = parseRgb(greenColor);
  expect(contrastOnWhite(greenRgb)).toBeGreaterThanOrEqual(4.5);

  // Faint text: the pictures card sublines once expanded on the Data step.
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.getByTestId('image-intake-toggle').click();
  const faintColor = await page.getByText('matched to your PHOTO column by file name.', { exact: false })
    .evaluate((el) => getComputedStyle(el).color);
  const faintRgb = parseRgb(faintColor);
  expect(contrastOnWhite(faintRgb)).toBeGreaterThanOrEqual(4.5);
});
