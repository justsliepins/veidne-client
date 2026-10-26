import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';

// Batch 4 item 3 (part 8, ruling 3): pdf_started fires on batch accept with
// { count: String(totalJobs) }, and pdf_generated fires exactly once when the
// flow reaches a terminal phase with { count: String(completedCount) }. We
// intercept the /analytics POSTs and assert each fires once with the right
// string count. Proteus: delay mode (a small batch reaches done quickly).

interface AnalyticsBody {
  event: string;
  data?: { count?: string };
}

test('analytics: pdf_started and pdf_generated each fire once with the right string counts', async ({ page }) => {
  const events: AnalyticsBody[] = [];
  await page.route('**/analytics', async (route) => {
    try {
      events.push(JSON.parse(route.request().postData() || '{}') as AnalyticsBody);
    } catch {
      /* ignore non-JSON */
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await seedDoneOn(page, 3);
  await page.getByTestId('pdf-create').click();
  await expect(page.getByRole('heading', { name: '3 PDFs ready' })).toBeVisible({ timeout: 30_000 });

  // Give any trailing analytics request time to flush.
  await page.waitForTimeout(500);

  const started = events.filter((e) => e.event === 'pdf_started');
  const generated = events.filter((e) => e.event === 'pdf_generated');

  expect(started).toHaveLength(1);
  expect(started[0].data?.count).toBe('3'); // totalJobs
  expect(generated).toHaveLength(1);
  expect(generated[0].data?.count).toBe('3'); // completedCount (all 3 succeeded)
});
