import { test, expect } from '@playwright/test';

// Work package 10 (homepage audit finding 8): the closed mobile menu is inert,
// opening it moves focus to Close, Tab stays inside, Escape closes it and focus
// returns to the Menu button (WCAG 2.4.3, 2.1.2, 4.1.2).
const BASE = 'http://localhost:5181';

test.describe('mobile menu keyboard path', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('focus moves into the open menu, stays inside, and returns to Menu on Escape', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const drawer = page.locator('#mobile-menu');
    await expect(drawer).toHaveAttribute('inert', '');
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const close = drawer.getByRole('button', { name: 'Close menu' });
    await expect(close).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(drawer.getByRole('link', { name: 'Open your Word document' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveAttribute('inert', '');
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  test('while the menu is open the page behind is inert; the library opened from it gives focus back to Menu', async ({ page }) => {
    await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
    await page.goto(`${BASE}/`);
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    await menu.click();
    await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
    await expect(page.locator('footer')).toHaveAttribute('inert', '');
    await page.locator('#mobile-menu').getByRole('button', { name: 'Templates' }).click();
    const library = page.getByRole('dialog', { name: 'Choose a template' });
    await expect(library).toBeVisible();
    // The library sits outside the page (in document.body) and the page behind it is inert.
    await expect(page.locator('#root')).toHaveAttribute('inert', '');
    await expect(page.locator('#main-content')).not.toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');
    await expect(library).toHaveCount(0);
    await expect(page.locator('#root')).not.toHaveAttribute('inert', '');
    await expect(menu).toBeFocused();
  });
});
