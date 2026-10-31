import { test, expect } from '@playwright/test';

// Work package 6 (journey audit findings 14 and 17): "How Veidne is funded" in
// the footer goes to /about#support, which scrolls to and focuses the donation
// box; the promises there match how the site works.
const BASE = 'http://localhost:5181';

test('/about#support brings the donation box into view and focuses it', async ({ page }) => {
  await page.goto(`${BASE}/about#support`);
  const box = page.locator('#support');
  await expect(box).toBeFocused();
  await expect(box).toBeInViewport();
  await expect(box).toContainText('Supporters can also suggest new features.');
  await expect(page.getByText('vote for new features')).toHaveCount(0);
});

test('the footer funding link points to the donation box', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('contentinfo').locator('a[href="/about#support"]')).toHaveCount(1);
});
