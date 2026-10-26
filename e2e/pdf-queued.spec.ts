import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';
import { postFiller, cancelBatchApi } from './proteus';

// Item a: queued phase. Proteus: delay mode, concurrency disabled, queue
// unlimited. Pre-fill a large BULK filler (> EXPRESS_THRESHOLD) to occupy the
// bulk slots, then a BULK UI batch lands behind it (position > 0) and shows the
// queued phase. (A small batch would be express and skip the queue.)
test('queued: In line pill, coarse wait, documents-ahead sub, cancel from queued', async ({ page }) => {
  const filler = await postFiller(12);
  try {
    await seedDoneOn(page, 6);
    await page.getByTestId('pdf-create').click();

    const flow = page.getByTestId('pdf-flow');
    await expect(flow).toHaveAttribute('data-phase', 'queued', { timeout: 15_000 });
    await expect(page.getByTestId('pdf-queued-pill')).toHaveText('In line');
    await expect(page.getByTestId('pdf-queued-wait')).toHaveText(/^About (a minute|\d+ minutes)$/);
    await expect(flow).toContainText('ahead of yours');
    await expect(page.getByTestId('pdf-cancel')).toHaveText('Cancel and download Word files');
    await page.screenshot({ path: 'e2e/screenshots/queued.png', fullPage: true });

    // Cancel from queued resolves to the canceled phase.
    await page.getByTestId('pdf-cancel').click();
    await expect(flow).toHaveAttribute('data-phase', 'canceled', { timeout: 10_000 });
  } finally {
    await cancelBatchApi(filler);
  }
});
