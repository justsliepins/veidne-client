import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';

// Batch 4 item 1 (part 5): follow scroll and the Jump to current pill. Proteus:
// delay mode so converting is observable and the frontier advances over time.
// While converting, the window follows the frontier (scrollTop grows as rows
// complete). A user wheel scroll pauses following and reveals the pill; clicking
// the pill resumes following and scrolls back toward the frontier.

const scrollTopOf = (page: import('@playwright/test').Page) =>
  page.getByTestId('pdf-files-scroll').evaluate((el) => el.scrollTop);

test('follow scroll: window follows the frontier, user scroll pauses with a Jump to current pill that resumes', async ({ page }) => {
  // > 8 files so the panel renders its capped, scrollable window.
  await seedDoneOn(page, 40);
  await page.getByTestId('pdf-create').click();

  const flow = page.getByTestId('pdf-flow');
  await expect(flow).toHaveAttribute('data-phase', 'converting', { timeout: 15_000 });

  // The window auto-follows the advancing frontier: scrollTop grows past the top
  // as rows above complete. No pill while following is active.
  await expect.poll(() => scrollTopOf(page), { timeout: 30_000 }).toBeGreaterThan(20);
  await expect(page.getByTestId('pdf-jump')).toHaveCount(0);

  // A real user scroll (wheel) over the window pauses following.
  const box = (await page.getByTestId('pdf-files-scroll').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -2000); // scroll up, away from the frontier

  const pill = page.getByTestId('pdf-jump');
  await expect(pill).toBeVisible();
  await expect(pill).toHaveText('Jump to current');
  await page.screenshot({ path: 'e2e/screenshots/followscroll-pill.png', fullPage: true });

  const afterWheel = await scrollTopOf(page);

  // Clicking the pill resumes following: it disappears and the window scrolls
  // back down toward the (now further along) frontier.
  await pill.click();
  await expect(pill).toHaveCount(0);
  await expect.poll(() => scrollTopOf(page), { timeout: 15_000 }).toBeGreaterThan(afterWheel + 20);

  // Cancel so this batch does not hold slots for later specs in the same run.
  await page.getByTestId('pdf-cancel').click();
});
