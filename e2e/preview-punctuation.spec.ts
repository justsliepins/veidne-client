import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';

// Regression spec for the merged-preview punctuation bug: tokenization splits on
// whitespace only, so characters glued to {{...}} braces ("{{AMOUNT}},",
// "({{PERCENT}})") live in the same token as the match, and the preview used to
// drop them when it swapped the token for the merged value. The generation path
// was never affected; step 5 pins that down too.
//
// Runs against the dark-launch server (:5181, PDF feature OFF) so the done
// surface is the classic FileList with per-file Word downloads. The upload →
// mapping → preview path under test is identical on both servers.
const BASE = 'http://localhost:5181';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');
const DATA = path.join(FIXTURES, 'veidne-format-test-data.xlsx');

// Record 1 merged into the template. Every substring crosses at least one
// character glued directly to braces in the template: commas after {{AMOUNT}},
// {{EURO}} and {{PERCENT}}, the final period after {{TEXTDATE}}, parens around
// {{PERCENT}}, the question mark after {{NAME}}, quotes around {{ZIP}}.
const RECORD1_SUBSTRINGS = [
  'reimbursement of $2,283.11, a deposit refund of 1,500.00 €, and an adjustment of 30.0%, as agreed in writing on February 22, 2025.',
  'approved (30.0%) for Anna Ozola? Code "02451", amount $2,283.11, refund 1,500.00 €.',
  'Riga, 22/02/2025',
  'Confirmed on 22/02/2025',
];

// Spaces collapse to "_", diacritics are preserved (fileNaming.ts does no ASCII
// folding), in row order.
const EXPECTED_FILENAMES = ['Anna_Ozola.docx', 'Jānis_Bērziņš.docx', 'Līga_Žagata.docx'];

// innerText with NBSP and whitespace runs normalized, so assertions are about
// characters, not layout.
async function normalizedText(page: Page, testId: string): Promise<string> {
  const raw = await page.getByTestId(testId).innerText();
  return raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
}

async function expectInBothPreviews(page: Page, sub: string): Promise<void> {
  await expect
    .poll(() => normalizedText(page, 'document-area'), { message: `main merged preview should contain: ${sub}` })
    .toContain(sub);
  await expect
    .poll(() => normalizedText(page, 'preview-panel-doc'), { message: `side preview panel should contain: ${sub}` })
    .toContain(sub);
}

test('merged preview keeps characters glued to placeholders; generated files stay correct', async ({ page }) => {
  // 1. Template + Data flow through the real UI.
  await page.goto(`${BASE}/start`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(DATA);
  // Column headers equal placeholder names, so every column auto-matches.
  await page.getByRole('button', { name: 'Looks good' }).click();
  // Preview of record 1; the Generate button appears once the entry transition settles.
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  // 2. Record 1 punctuation in both renderers (main document + side panel).
  for (const sub of RECORD1_SUBSTRINGS) {
    await expectInBothPreviews(page, sub);
  }

  // 3. Page to record 2, then back.
  await page.getByText('1 of 3', { exact: true }).locator('..').locator('button').nth(1).click();
  await expect(page.getByText('2 of 3', { exact: true })).toBeVisible();
  await expectInBothPreviews(page, 'Jānis Bērziņš');
  await page.getByText('2 of 3', { exact: true }).locator('..').locator('button').nth(0).click();
  await expect(page.getByText('1 of 3', { exact: true })).toBeVisible();
  await expectInBothPreviews(page, 'Anna Ozola');

  // 4. Name files by NAME (the default is the template's first placeholder,
  // TRUEDATE), then generate and capture the three individual Word downloads.
  await page.getByLabel('Name files by').click();
  await page.getByRole('option', { name: 'NAME' }).click();
  await expect(page.getByText('Anna_Ozola.docx', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });

  const downloadedNames: string[] = [];
  const downloadedPaths: string[] = [];
  for (const name of EXPECTED_FILENAMES) {
    // Both the row div and its name span match the exact text; either receives
    // the row's click handler, so take the first.
    const row = page.getByText(name, { exact: true }).first();
    await expect(row, `done list should offer ${name}`).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await row.click();
    const download = await downloadPromise;
    downloadedNames.push(download.suggestedFilename());
    downloadedPaths.push((await download.path())!);
    // The first single-file download of a real run opens the post-download
    // donation modal, whose overlay would otherwise sit over the next row.
    const modal = page.getByRole('dialog');
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    }
  }
  expect(downloadedNames).toEqual(EXPECTED_FILENAMES);

  // 5. The generated record-1 document keeps the glued punctuation (the
  // generation path is separate from the preview and must stay correct).
  const docx = await JSZip.loadAsync(fs.readFileSync(downloadedPaths[0]));
  const xml = await docx.file('word/document.xml')!.async('string');
  const docText = Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join('');
  expect(docText).toContain('$2,283.11, a deposit refund of');
  expect(docText).toContain('as agreed in writing on February 22, 2025.');
});
