import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { seedDoneOn, rowStatuses } from './helpers';

// Item d: unreachable phase. Proteus: delay mode. This test stops the Proteus
// container mid-conversion (poll-time unreachable) and while it is down submits
// again (submit-time unreachable), then restarts it for the rest of the suite.
//
// It needs a local checkout of the Proteus converter with its docker compose
// files. Point PROTEUS_DIR at that checkout; the default is a directory named
// Proteus next to this repository. Without one the test is skipped, since
// there is no container to stop.
const PROTEUS_DIR =
  process.env.PROTEUS_DIR ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'Proteus');
const COMPOSE = 'docker compose -f docker-compose.yml -f docker-compose.dev.yml';
const sh = (cmd: string) => execSync(cmd, { cwd: PROTEUS_DIR, stdio: 'ignore' });

test.skip(
  !existsSync(path.join(PROTEUS_DIR, 'docker-compose.yml')),
  'needs a local Proteus checkout (set PROTEUS_DIR)',
);

async function waitHealthz(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch('http://localhost:8085/healthz');
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error('Proteus did not become healthy');
}

test('unreachable: poll-time (container stops mid-convert) and submit-time', async ({ page }) => {
  try {
    // Poll-time: start a large conversion (stays in flight long enough to stop
    // reliably), then take Proteus down.
    await seedDoneOn(page, 30);
    await page.getByTestId('pdf-create').click();
    const flow = page.getByTestId('pdf-flow');
    // In flight (converting, or queued if other batches hold the slots).
    await expect(flow).toHaveAttribute('data-phase', /^(converting|queued)$/, { timeout: 15_000 });

    sh(`${COMPOSE} stop proteus`);
    // Three consecutive poll failures (~3s) flip the phase to unreachable.
    await expect(flow).toHaveAttribute('data-phase', 'unreachable', { timeout: 25_000 });
    await expect(flow).toContainText('The converter could not be reached');
    await expect(page.getByTestId('pdf-retry')).toBeVisible(); // network unreachable keeps retry
    await expect(page.getByTestId('pdf-word-download')).toBeVisible();

    // Review fix 6: the spinner animation stops on unreachable. Last-known
    // statuses may remain, but no row may still appear to be actively converting.
    expect(await rowStatuses(page)).not.toContain('converting');

    await page.screenshot({ path: 'e2e/screenshots/unreachable.png', fullPage: true });

    // Submit-time: with Proteus still down, a fresh submit fails immediately.
    await seedDoneOn(page, 3);
    await page.getByTestId('pdf-create').click();
    const flow2 = page.getByTestId('pdf-flow');
    await expect(flow2).toHaveAttribute('data-phase', 'unreachable', { timeout: 15_000 });
    await expect(flow2).toContainText('The converter could not be reached');
  } finally {
    // Always restore Proteus for the remaining tests. Force-recreate gives a
    // fresh container with a clean temp dir (a plain start after stop can leave
    // /tmp/proteus unwritable).
    sh(`${COMPOSE} up -d --force-recreate`);
    await waitHealthz();
  }
});
