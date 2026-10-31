import { test, expect } from '@playwright/test';

// Work package 8 (homepage audit findings 1, 4, 5, 6, 12): the hero states the
// privacy promise with its one exception, says what is needed, every primary
// button opens /editor, and the library opens from the page. Experiments stay
// off unless their build variables are set.
const BASE = 'http://localhost:5181';

test('the hero states the privacy exception, what is needed, and opens the library from the page', async ({ page }) => {
  await page.goto(`${BASE}/`);
  const main = page.getByRole('main');
  await expect(main.getByText('Your Word document and spreadsheet are never uploaded.')).toBeVisible();
  await expect(main.getByText(/Finished files go to our server only if you choose PDF\. They are converted in Germany/)).toBeVisible();
  await expect(main.getByText(/You need a Word document \(\.docx\) written for one person\./)).toBeVisible();
  for (const link of await main.getByRole('link', { name: 'Open your Word document' }).all()) {
    await expect(link).toHaveAttribute('href', '/editor');
  }
  await main.getByRole('button', { name: 'Start from a ready-made template' }).click();
  await expect(page.getByRole('dialog', { name: 'Choose a template' })).toBeVisible();
  // Experiments are off by default: their sections are not on the page.
  await expect(page.getByText('What people make with Veidne')).toHaveCount(0);
  await expect(page.getByText('Questions before you start')).toHaveCount(0);
  await expect(page.getByText('The browser client is open source (AGPL-3.0).')).toHaveCount(0);
});

test('at 320 px nothing on the homepage is wider than the screen, the data table included', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('heading', { name: 'Where your data goes' })).toBeVisible();
  // overflow-x is hidden on the page, so a scrollbar would not show a problem: measure instead.
  const wider = await page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
    // Decorative layers and the closed menu drawer (inert, moved off screen) are not content.
    .filter((el) => !el.closest('[aria-hidden="true"], [inert]'))
    .map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')));
  expect(wider).toEqual([]);
});
