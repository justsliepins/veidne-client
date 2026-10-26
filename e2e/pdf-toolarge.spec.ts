import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';

// Item c: tooLarge (413) variant of unreachable. Proteus: MAX_BATCH_DOCS small.
// Submitting more docs than the cap returns 413; the UI shows the too-large
// sentence with retry hidden and the Word download offered.
test('tooLarge: 413 shows the too-large copy, retry hidden, Word offered', async ({ page }) => {
  await seedDoneOn(page, 3); // MAX_BATCH_DOCS is set to 2 for this run
  await page.getByTestId('pdf-create').click();

  const flow = page.getByTestId('pdf-flow');
  await expect(flow).toHaveAttribute('data-phase', 'unreachable', { timeout: 15_000 });
  // Review fix 7: the 413 case has its own heading, distinct from the
  // connectivity ("could not be reached") heading.
  await expect(flow.getByRole('heading')).toHaveText('That is too many documents at once');
  await expect(flow).toContainText('This batch is too large to convert in one go');
  await expect(page.getByTestId('pdf-retry')).toHaveCount(0); // retry hidden
  await expect(page.getByTestId('pdf-word-download')).toBeVisible(); // Word offered
  await page.screenshot({ path: 'e2e/screenshots/toolarge.png', fullPage: true });
});
