import { test, expect } from '@playwright/test';
import { seedDoneOn, rowStems, rowStatuses } from './helpers';

// Items c (collapse rule for >8) and d (flat list for <=8). Entry state only,
// no conversion, so these are Proteus-mode independent.

test('d: 8 or fewer files renders a flat list with no header, toggle, or scroll chrome', async ({ page }) => {
  await seedDoneOn(page, 6);

  // Entry shows the Word primary, Create PDFs outline, and the privacy note.
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible();
  await expect(page.getByTestId('pdf-create')).toHaveText('Create PDFs');
  await expect(page.getByTestId('pdf-privacy')).toBeVisible();

  const files = page.getByTestId('pdf-files');
  await expect(files).toHaveAttribute('data-variant', 'flat');
  await expect(page.getByTestId('pdf-files-toggle')).toHaveCount(0);
  await expect(page.getByTestId('pdf-files-scroll')).toHaveCount(0);
  expect(await rowStems(page)).toEqual(['Doc_1', 'Doc_2', 'Doc_3', 'Doc_4', 'Doc_5', 'Doc_6']);
  expect(await rowStatuses(page)).toEqual(Array(6).fill('waiting'));

  await page.screenshot({ path: 'e2e/screenshots/d-flat-list.png', fullPage: true });
});

test('c: more than 8 files gets the Files (N) panel, capped scroll window, Hide/Show toggle', async ({ page }) => {
  await seedDoneOn(page, 12);

  const files = page.getByTestId('pdf-files');
  await expect(files).toHaveAttribute('data-variant', 'panel');
  await expect(files).toContainText('Files');
  await expect(files).toContainText('(12)');

  const toggle = page.getByTestId('pdf-files-toggle');
  await expect(toggle).toHaveText('Hide');

  // Scroll window caps at about 8 rows: all 12 rows exist but the window is not
  // tall enough to show them all (content overflows the capped viewport).
  const scroll = page.getByTestId('pdf-files-scroll');
  await expect(scroll).toBeVisible();
  expect((await rowStems(page)).length).toBe(12);
  const metrics = await scroll.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
  expect(metrics.scroll).toBeGreaterThan(metrics.client); // capped: content overflows
  expect(metrics.client).toBeLessThanOrEqual(290); // ~8 rows desktop (max-height 272)

  await page.screenshot({ path: 'e2e/screenshots/c-collapse-expanded.png', fullPage: true });

  // Hide collapses the window; the label becomes Show N files.
  await toggle.click();
  await expect(scroll).toBeHidden();
  await expect(toggle).toHaveText('Show 12 files');
  await page.screenshot({ path: 'e2e/screenshots/c-collapse-collapsed.png', fullPage: true });

  // Show re-expands.
  await toggle.click();
  await expect(scroll).toBeVisible();
  await expect(toggle).toHaveText('Hide');
});
