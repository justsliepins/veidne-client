import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';
import { getBatchApi } from './proteus';

// Item g + ruling 12: navigating the page away cancels the in-flight batch
// (keepalive on pagehide), but a hidden-tab simulation (visibilitychange) does
// NOT cancel it. Proteus: delay mode so the batch stays in flight.
test('keepalive: navigate-away cancels in flight; hidden tab does not', async ({ page }) => {
  let batchId = '';
  page.on('response', async (r) => {
    if (r.request().method() === 'POST' && r.url().endsWith('/v1/batches')) {
      try { batchId = (await r.json()).batchId; } catch { /* ignore */ }
    }
  });

  await seedDoneOn(page, 6);
  await page.getByTestId('pdf-create').click();
  // In flight (converting, or queued if other batches hold the slots).
  await expect(page.getByTestId('pdf-flow')).toHaveAttribute('data-phase', /^(converting|queued)$/, { timeout: 15_000 });
  expect(batchId).not.toBe('');

  // Hidden-tab simulation must NOT cancel (visibilitychange is not a trigger).
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1500);
  const afterHide = await getBatchApi(batchId);
  expect(['queued', 'running']).toContain(afterHide?.status);

  // Navigating away fires the keepalive cancel (pagehide).
  await page.goto('about:blank');
  await page.waitForTimeout(2000);
  const afterNav = await getBatchApi(batchId);
  expect(afterNav?.status).toBe('canceled');
});
