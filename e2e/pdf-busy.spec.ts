import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';
import { postFiller, cancelBatchApi } from './proteus';

// Item b: busy phase. Proteus: delay mode, SLOT_MIN=SLOT_MAX=1, MAX_QUEUE_DEPTH=3,
// a long converter delay so the queue stays full. A filler of 3 leaves 1 running
// + 2 queued; the UI submit of 2 (2 + 2 > 3) gets a 429 -> busy. Then we drain
// the queue and Try PDFs again proceeds to a successful run.
test('busy: 429 -> At capacity, then drain + Try PDFs again proceeds to done', async ({ page }) => {
  await seedDoneOn(page, 2);
  // Fill the queue immediately before submitting so it is still full.
  const filler = await postFiller(3);
  let drained = false;
  try {
    await page.getByTestId('pdf-create').click();

    const flow = page.getByTestId('pdf-flow');
    await expect(flow).toHaveAttribute('data-phase', 'busy', { timeout: 15_000 });
    await expect(page.getByTestId('pdf-busy-pill')).toHaveText('At capacity');
    await expect(flow).toContainText('The converter is busy right now');
    await expect(page.getByTestId('pdf-retry')).toHaveText('Try PDFs again');
    await page.screenshot({ path: 'e2e/screenshots/busy.png', fullPage: true });

    // Drain the queue, then retry.
    await cancelBatchApi(filler);
    drained = true;
    await page.waitForTimeout(1500);
    await page.getByTestId('pdf-retry').click();
    await expect(flow).toHaveAttribute('data-phase', 'done', { timeout: 40_000 });
  } finally {
    if (!drained) await cancelBatchApi(filler);
  }
});
