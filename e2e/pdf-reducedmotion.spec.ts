import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';

// Item g: with prefers-reduced-motion: reduce, the converting spinner ring
// becomes a solid periwinkle dot and the sending bar is a static fill (no
// animation). Requires Proteus in delay mode to observe converting.
test('g: reduced motion shows solid dots and a static sending bar (no animations)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedDoneOn(page, 12);

  await page.route('**/v1/batches', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.getByTestId('pdf-create').click();

  // Sending bar fill is static (no slide animation).
  await expect(page.getByRole('heading', { name: 'Sending your documents' })).toBeVisible({ timeout: 5_000 });
  const barFill = page.getByTestId('pdf-bar-fill');
  const barAnim = await barFill.evaluate((el) => getComputedStyle(el).animationName);
  expect(barAnim).toBe('none');

  // Converting icon is a solid periwinkle dot: no spin animation, filled bg, no ring border.
  await expect(page.getByRole('heading', { name: 'Converting to PDF' })).toBeVisible({ timeout: 15_000 });
  const icon = page.locator('[data-status="converting"] [data-testid="pdf-row-icon"]').first();
  await icon.waitFor({ state: 'visible', timeout: 15_000 });
  const style = await icon.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { anim: cs.animationName, bg: cs.backgroundColor, border: cs.borderTopStyle };
  });
  expect(style.anim).toBe('none'); // no spinner
  expect(style.bg).toBe('rgb(85, 102, 196)'); // solid periwinkle dot
  expect(style.border).toBe('none'); // not a ring

  await page.screenshot({ path: 'e2e/screenshots/g-reducedmotion-converting.png', fullPage: true });

  // Cancel so this batch does not hold slots for later specs in the same run.
  await page.getByTestId('pdf-cancel').click();
});
