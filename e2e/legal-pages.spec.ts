import { test, expect } from '@playwright/test';

// H2, H9, H10, H20 and the footer Trust group: every footer link reaches a
// real page, each page has its own title and one h1, and /privacy#cookies
// lands on the cookies section. The prerendered HTML is checked separately
// after `npm run build` (see the spec, section 7).
const BASE = 'http://localhost:5181';

test('footer Trust links reach the privacy notice, its cookies section and the accessibility page', async ({ page }) => {
  await page.goto(`${BASE}/`);
  const trust = page.getByRole('contentinfo').getByRole('navigation', { name: 'Trust' });

  await trust.getByRole('link', { name: 'Privacy notice' }).click();
  await expect(page).toHaveURL(`${BASE}/privacy`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy notice');

  await page.getByRole('contentinfo').getByRole('navigation', { name: 'Trust' })
    .getByRole('link', { name: 'Cookies and statistics' }).click();
  await expect(page).toHaveURL(`${BASE}/privacy#cookies`);
  await expect(page.locator('h2#cookies')).toBeFocused();
  await expect(page.locator('h2#cookies')).toBeInViewport();

  await page.getByRole('contentinfo').getByRole('navigation', { name: 'Trust' })
    .getByRole('link', { name: 'Accessibility' }).click();
  await expect(page).toHaveURL(`${BASE}/accessibility`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accessibility');
});

for (const [path, title, h1] of [
  ['/privacy', 'Privacy Notice | Veidne', 'Privacy notice'],
  ['/accessibility', 'Accessibility | Veidne', 'Accessibility'],
] as const) {
  test(`${path} has its own title, canonical and exactly one h1`, async ({ page }) => {
    await page.goto(`${BASE}${path}`);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://veidne.com${path}`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(h1);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });
}

test('the privacy notice lists every localStorage key the client writes', async ({ page }) => {
  await page.goto(`${BASE}/privacy`);
  for (const key of ['veidne_consent', 'veidne_first_touch', 'veidne_session', 'veidne_formatConventions', 'veidne.pdfConsent', 'veidne_field_nudge_seen',
    'veidne_rangeHintSeen', 'veidne_donatedAt', 'veidne_askDeclinedAt', 'veidne_donateFrom']) {
    await expect(page.locator('section[aria-labelledby="storage"] table').getByText(key, { exact: true })).toBeVisible();
  }
});

test('a page link from the footer opens the privacy notice at the top', async ({ page }) => {
  await page.goto(`${BASE}/about`);
  await page.mouse.wheel(0, 5000);
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy notice' }).click();
  await expect(page).toHaveURL(`${BASE}/privacy`);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
});

test('while the operator details are placeholders, no footer shows them', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('footer')).toContainText('© 2026 Veidne. All rights reserved.');
  await expect(page.locator('footer')).not.toContainText('TO FILL');
  await expect(page.locator('footer')).not.toContainText('Operated by');
});

test.describe('reflow', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('at 320 px nothing on the privacy notice is wider than the screen', async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const wider = await page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .filter((el) => !el.closest('[aria-hidden="true"], [inert]'))
      .map((el) => el.tagName.toLowerCase() + ' ' + (el.textContent || '').trim().slice(0, 40)));
    expect(wider).toEqual([]);
  });
});
