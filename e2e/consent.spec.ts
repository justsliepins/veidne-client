import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page, type Request } from '@playwright/test';

// Work package 14: the cookie banner. Every other spec starts with the choice
// made (playwright.config.ts); these start without one.
const BASE = 'http://localhost:5181';
test.use({ storageState: { cookies: [], origins: [] } });

interface Sent { event: string; data?: Record<string, unknown>; consent: string | undefined; credentialsCookie: string | undefined }

// Answers every analytics call here and records its event and headers.
async function watchAnalytics(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.route('**/api/analytics', async (route) => {
    const req: Request = route.request();
    const body = JSON.parse(req.postData() ?? '{}') as { event: string; data?: Record<string, unknown> };
    const headers = await req.allHeaders();
    sent.push({ event: body.event, data: body.data, consent: headers['x-veidne-consent'], credentialsCookie: headers['cookie'] });
    await route.fulfill({ status: 204 });
  });
  return sent;
}

const banner = (page: Page) => page.getByRole('region', { name: 'Can we use one cookie for our statistics?' });
const storedChoice = (page: Page) => page.evaluate(() => localStorage.getItem('veidne_consent'));

test('a first visit shows the banner with two equal choices and records nothing for the device', async ({ page, context }) => {
  // An old cookie and statistics values from before the banner: none of them
  // may be used or kept without a choice.
  await context.addCookies([{ name: 'veidne_uid', value: 'legacy', domain: 'localhost', path: '/', httpOnly: true }]);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('veidne_first_touch', '{"referrerHost":"old.example"}');
      localStorage.setItem('veidne_generatedTotal', '7');
    }
  });
  const sent = await watchAnalytics(page);
  await page.goto(`${BASE}/`);
  await expect(banner(page)).toBeVisible();
  const allow = banner(page).getByRole('button', { name: 'Allow cookie' });
  const deny = banner(page).getByRole('button', { name: "Don't allow" });
  await expect(allow).toBeVisible();
  await expect(deny).toBeVisible();

  // Refusing is as visible and as easy as allowing (CTA-23, CTA-27).
  const look = (el: typeof allow) => el.evaluate((b) => {
    const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
    return { bg: cs.backgroundColor, color: cs.color, weight: cs.fontWeight, size: cs.fontSize, h: Math.round(r.height), w: Math.round(r.width) };
  });
  const [a, d] = [await look(allow), await look(deny)];
  expect({ ...d, w: 0 }).toEqual({ ...a, w: 0 });
  expect(a.h).toBeGreaterThanOrEqual(44);

  // Before a choice the page view goes out without the consent header and
  // without cookies, and nothing for statistics is kept in the browser.
  await expect.poll(() => sent.filter((s) => s.event === 'page_view').length).toBeGreaterThan(0);
  const view = sent.find((s) => s.event === 'page_view')!;
  expect(view.consent).toBeUndefined();
  expect(view.credentialsCookie).toBeUndefined();
  expect(await page.evaluate(() => [localStorage.getItem('veidne_first_touch'), localStorage.getItem('veidne_generatedTotal')])).toEqual([null, null]);
  expect(await storedChoice(page)).toBeNull();
});

test('the banner is the first stop for the keyboard after the skip link and does not take focus itself', async ({ page }) => {
  await watchAnalytics(page);
  await page.goto(`${BASE}/`);
  await expect(banner(page)).toBeVisible();
  await expect(page.locator('body')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(banner(page).getByRole('link', { name: 'More about cookies' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(banner(page).getByRole('button', { name: 'Allow cookie' })).toBeFocused();
});

test("Don't allow closes the banner, is remembered, and tells the server to drop the cookie", async ({ page }) => {
  const sent = await watchAnalytics(page);
  await page.goto(`${BASE}/`);
  await page.evaluate(() => { localStorage.setItem('veidne_first_touch', '{}'); });
  await banner(page).getByRole('button', { name: "Don't allow" }).click();
  await expect(banner(page)).toHaveCount(0);

  await expect.poll(() => sent.find((s) => s.event === 'consent_choice')).toBeTruthy();
  const choice = sent.find((s) => s.event === 'consent_choice')!;
  expect(choice.data).toEqual({ choice: 'denied', surface: 'banner' });
  expect(choice.consent).toBe('none');
  expect(JSON.parse((await storedChoice(page))!)).toMatchObject({ v: 1, statistics: false });
  // Values kept only for statistics are removed with the refusal.
  expect(await page.evaluate(() => localStorage.getItem('veidne_first_touch'))).toBeNull();

  sent.length = 0;
  await page.reload();
  await expect.poll(() => sent.filter((s) => s.event === 'page_view').length).toBeGreaterThan(0);
  await expect(banner(page)).toHaveCount(0);
  expect(sent.find((s) => s.event === 'page_view')!.consent).toBe('none');
  expect(await page.evaluate(() => localStorage.getItem('veidne_first_touch'))).toBeNull();
});

test('Allow cookie closes the banner, and later page views carry the consent', async ({ page }) => {
  const sent = await watchAnalytics(page);
  await page.goto(`${BASE}/?utm_source=newsletter`);
  await banner(page).getByRole('button', { name: 'Allow cookie' }).click();
  await expect(banner(page)).toHaveCount(0);
  // The choice itself goes out without any identifier.
  await expect.poll(() => sent.find((s) => s.event === 'consent_choice')?.data).toEqual({ choice: 'granted', surface: 'banner' });
  expect(sent.find((s) => s.event === 'consent_choice')!.consent).toBeUndefined();

  // The arrival page was reported without storing anything; after consent the
  // browser keeps first-visit attribution as before.
  expect(sent.find((s) => s.event === 'page_view')!.data).toMatchObject({ attribution: { utmSource: 'newsletter' } });
  sent.length = 0;
  await page.getByRole('contentinfo').getByRole('link', { name: 'About us' }).click();
  await expect.poll(() => sent.find((s) => s.event === 'page_view')?.consent).toBe('statistics');
  // The first touch keeps the campaign of the page the visitor arrived on.
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('veidne_first_touch')))!)).toMatchObject({ utmSource: 'newsletter' });
});

test('the privacy notice shows the choice and opens the banner again, with focus going there and back', async ({ page }) => {
  const sent = await watchAnalytics(page);
  await page.goto(`${BASE}/privacy`);
  await banner(page).getByRole('button', { name: "Don't allow" }).click();
  const status = page.locator('section[aria-labelledby="cookies"]').getByRole('status');
  await expect(status).toHaveText('On this device you do not allow the statistics cookie.');

  const change = page.getByRole('button', { name: 'Change your cookie choice' });
  await change.click();
  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole('heading', { name: 'Can we use one cookie for our statistics?' })).toBeFocused();
  await expect(banner(page)).toContainText('You do not allow it now.');

  // Escape keeps the earlier choice and returns focus.
  await page.keyboard.press('Escape');
  await expect(banner(page)).toHaveCount(0);
  await expect(change).toBeFocused();
  await expect(status).toHaveText('On this device you do not allow the statistics cookie.');

  await change.click();
  sent.length = 0;
  await banner(page).getByRole('button', { name: 'Allow cookie' }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(change).toBeFocused();
  await expect(status).toHaveText('On this device you allow the statistics cookie.');
  await expect.poll(() => sent.find((s) => s.event === 'consent_choice')?.data).toEqual({ choice: 'granted', surface: 'privacy' });
});

test('a choice made in another tab closes the banner here too', async ({ page, context }) => {
  await watchAnalytics(page);
  await page.goto(`${BASE}/about`);
  await expect(banner(page)).toBeVisible();
  const other = await context.newPage();
  await watchAnalytics(other);
  await other.goto(`${BASE}/privacy`);
  await banner(other).getByRole('button', { name: "Don't allow" }).click();
  await expect(banner(page)).toHaveCount(0);
  await other.close();
});

test('the page keeps room for the banner, so the end of the page is never under it', async ({ page }) => {
  await watchAnalytics(page);
  await page.goto(`${BASE}/about`);
  await expect(banner(page)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const links = page.getByRole('contentinfo').getByRole('link');
  const last = links.last();
  await expect(last).toBeVisible();
  const lastBox = (await last.boundingBox())!;
  const bannerBox = (await banner(page).boundingBox())!;
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(bannerBox.y + 1);

  await banner(page).getByRole('button', { name: 'Allow cookie' }).click();
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--consent-banner-h'))).toBe('');
});

test('the footer and the editor header open the banner again, and focus returns', async ({ page }) => {
  await watchAnalytics(page);
  await page.goto(`${BASE}/about`);
  await banner(page).getByRole('button', { name: 'Allow cookie' }).click();
  const footerButton = page.getByRole('contentinfo').getByRole('button', { name: 'Cookie choice' });
  await footerButton.click();
  await expect(banner(page).getByRole('heading', { name: 'Can we use one cookie for our statistics?' })).toBeFocused();
  await expect(banner(page)).toContainText('You allow it now.');
  await banner(page).getByRole('button', { name: "Don't allow" }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(footerButton).toBeFocused();

  await page.goto(`${BASE}/editor`);
  const headerButton = page.getByRole('navigation').getByRole('button', { name: 'Cookie choice' });
  await headerButton.click();
  await expect(banner(page)).toContainText('You do not allow it now.');
  await page.keyboard.press('Escape');
  await expect(headerButton).toBeFocused();
});

const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'veidne-format-test-template.docx');

test.describe('phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('at 320 px the banner fits the screen and its buttons stay large enough', async ({ page }) => {
    await watchAnalytics(page);
    await page.goto(`${BASE}/`);
    await expect(banner(page)).toBeVisible();
    const wider = await banner(page).evaluate((root) => [root, ...root.querySelectorAll('*')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).length);
    expect(wider).toBe(0);
    for (const name of ['Allow cookie', "Don't allow"]) {
      const box = (await banner(page).getByRole('button', { name }).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const bannerBox = (await banner(page).boundingBox())!;
    // Less than half of the screen, so the page behind it can still be read.
    expect(bannerBox.height).toBeLessThan(320);
  });

  test('in the editor on a phone, no fixed bar is under the banner', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await watchAnalytics(page);
    await page.goto(`${BASE}/editor?flow=template-data`);
    await page.locator('input[type="file"]').first().setInputFiles(TEMPLATE);
    await expect(page.getByTestId('document-area')).toBeVisible();
    await expect(banner(page)).toBeVisible();
    await page.waitForTimeout(500);
    const { fixed, covered } = await page.evaluate(() => {
      const b = document.getElementById('consent-banner')!.getBoundingClientRect();
      const all = [...document.querySelectorAll('body *')]
        .filter((el) => !el.closest('#consent-banner') && getComputedStyle(el).position === 'fixed')
        .filter((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.width > 0 && getComputedStyle(el).visibility !== 'hidden'; });
      return {
        fixed: all.length,
        covered: all.filter((el) => el.getBoundingClientRect().bottom > b.top + 1).map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80)),
      };
    });
    // The fields bar and the forward bar are on screen, and above the banner.
    expect(fixed).toBeGreaterThan(0);
    expect(covered).toEqual([]);
  });

  for (const [w, h] of [[844, 390], [320, 256]] as const) {
    test(`on a ${w}x${h} screen the banner takes at most half of it and both buttons stay visible`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await watchAnalytics(page);
      await page.goto(`${BASE}/`);
      await expect(banner(page)).toBeVisible();
      const box = (await banner(page).boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(h / 2 + 1);
      for (const name of ['Allow cookie', "Don't allow"]) {
        await expect(banner(page).getByRole('button', { name })).toBeInViewport({ ratio: 1 });
      }
    });
  }
});
