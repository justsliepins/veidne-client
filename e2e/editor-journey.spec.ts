import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

// Journey audit (Nov 2026), editor items J15, J16, J19, J23, J24: the
// generation error panel, focus at step changes, Generate without waiting for
// the reveal, the phone preview layout, and the resume screen. Relative URLs,
// so the suite's baseURL decides the server.
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function makeDocx(text: string): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.folder('_rels')!.file('.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word')!.file('document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`);
  return { name: 'letter.docx', mimeType: DOCX_MIME, buffer: await zip.generateAsync({ type: 'nodebuffer' }) };
}

function xlsxOf(rows: Record<string, string>[]): { name: string; mimeType: string; buffer: Buffer } {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sheet1');
  return {
    name: 'people.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
  };
}

/** Upload a one-line letter, make one field from "Anna" with the given name,
 *  load two rows whose column has the same name, and confirm the mapping. */
async function toPreview(page: Page, fieldName: string, rows?: Record<string, string>[]) {
  await page.goto('/editor?flow=template-data');
  await page.locator('input[type="file"]').setInputFiles(await makeDocx('Dear Anna welcome to the course'));
  await expect(page.getByTestId('document-area')).toBeVisible();
  await page.getByText('Anna', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Field name' }).fill(fieldName);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add your data' }).last().click();
  await page.locator('input[type="file"]').setInputFiles(xlsxOf(rows ?? [{ [fieldName]: 'Liga' }, { [fieldName]: 'Peteris' }]));
}

test.describe('J15 generation error panel', () => {
  test('a field name the engine reads as a command is named in a panel, not a toast', async ({ page }) => {
    await toPreview(page, '#Name');
    await page.getByRole('button', { name: 'Looks good' }).click();
    const generate = page.getByRole('button', { name: /^Generate/ });
    await generate.click();

    const panel = page.getByTestId('generate-error');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'alert');
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText("We couldn't generate your documents. Your fields are kept.");
    await expect(page.getByTestId('generate-error-cause')).toHaveText(
      'The field name "#Name" starts with "#", which Veidne reads as a command. Rename the field without "#", then generate again.');
    await expect(panel).toBeFocused();
    // Retrying is allowed while the panel is up.
    await expect(generate).toBeEnabled();

    // Close returns focus to Generate; the next failure brings the panel back.
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).toHaveCount(0);
    await expect(generate).toBeFocused();
    await generate.click();
    await expect(panel).toBeVisible();

    // The fix: rename the field in the Fields step.
    await panel.getByRole('button', { name: 'Go to Fields' }).click();
    await expect(page.getByRole('group', { name: 'Your document' })).toBeVisible();
    await expect(page.getByTestId('generate-error')).toHaveCount(0);
  });

  test('on a phone the panel sits at the top of the preview panel, in view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await toPreview(page, '#Name');
    await page.getByRole('button', { name: 'Looks good' }).click();
    await page.getByRole('button', { name: /^Generate/ }).click();
    const panel = page.getByTestId('generate-error');
    await expect(panel).toBeInViewport();
    const onTop = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + 20);
      return !!hit && el.contains(hit);
    });
    expect(onTop).toBe(true);
  });
});

test.describe('J16 focus at step changes', () => {
  test('after the column mapping, focus is on Generate; after generating, on the result heading', async ({ page }) => {
    await toPreview(page, 'Name');
    await page.getByRole('button', { name: 'Looks good' }).click();
    const generate = page.getByRole('button', { name: /^Generate/ });
    await expect(generate).toBeFocused();
    await page.keyboard.press('Enter');
    const heading = page.getByRole('heading', { level: 1, name: '2 documents generated' });
    await expect(heading).toBeFocused();
  });
});

test.describe('J19 Generate does not wait for the reveal', () => {
  test('Generate is there as soon as the mapping closes', async ({ page }) => {
    await toPreview(page, 'Name');
    await page.getByRole('button', { name: 'Looks good' }).click();
    await expect(page.getByRole('button', { name: /^Generate/ })).toBeVisible({ timeout: 700 });
  });

  test('with reduced motion the preview opens in its final state, with nothing animating', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toPreview(page, 'Name');
    await page.getByRole('button', { name: 'Looks good' }).click();
    await expect(page.getByRole('button', { name: /^Generate/ })).toBeVisible({ timeout: 700 });
    // The final info line (with Got it) is the first thing shown, not a 2.4 s sequence.
    await expect(page.getByRole('button', { name: 'Got it' })).toBeVisible({ timeout: 700 });
    await page.waitForTimeout(300);
    // Movement and fades only: colour changes, such as the step circles turning
    // green, are not motion (WCAG 2.3.3) and may still transition.
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => {
      if (a.playState !== 'running') return false;
      const prop = (a as CSSTransition).transitionProperty;
      return a instanceof CSSAnimation || prop === 'transform' || prop === 'opacity';
    }).length);
    expect(moving).toBe(0);
  });
});

test.describe('J23 phone preview layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the preview header links are reachable, 44 px tall, and the template link left the step bar', async ({ page }) => {
    await toPreview(page, 'Name');
    await page.getByRole('button', { name: 'Looks good' }).tap();
    await expect(page.getByRole('button', { name: /^Generate/ })).toBeVisible();
    for (const name of ['Save template (.docx)', 'Replace data', 'Back to Fields']) {
      const btn = page.getByRole('button', { name, exact: true });
      await expect(btn).toHaveCount(1);
      const box = (await btn.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      const reachable = await btn.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      });
      expect(reachable, `${name} is not covered`).toBe(true);
    }
    expect((await page.getByRole('button', { name: /^Generate/ }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test('the empty-field warning is visible on a phone, not hidden under the preview panel', async ({ page }) => {
    await toPreview(page, 'Name', [{ Other: 'x' }, { Other: 'y' }]);
    await page.getByRole('button', { name: 'Continue with 1 empty field' }).tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const warning = page.getByText('1 field has no column:', { exact: false });
    await expect(warning).toBeInViewport();
    const onTop = await warning.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
    });
    expect(onTop).toBe(true);
  });
});

test.describe('J24 resume screen', () => {
  test.beforeEach(async ({ page }) => {
    const docx = await makeDocx('Dear {{NAME}} welcome');
    await page.addInitScript(({ b64 }) => {
      localStorage.setItem('veidne_session', JSON.stringify({
        sourceFileName: 'letter.docx', documentHtml: '', rawDocxBase64: b64,
        placeholders: [{ id: 'ph-1', name: 'NAME', originalText: '{{NAME}}', colorIndex: 0, occurrences: [] }],
        editorPhase: 'placeholders', dataSubState: 'bridge', kitDownloaded: false, savedAt: Date.now(),
      }));
    }, { b64: docx.buffer.toString('base64') });
  });

  test('the demo link with a saved project asks before it deletes the project', async ({ page }) => {
    await page.goto('/editor?flow=exploring');
    await expect(page.getByText('You have an unfinished project')).toBeVisible();
    await expect(page.getByText('Starting the sample deletes this project.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('veidne_session') !== null)).toBe(true);
    await page.getByRole('button', { name: 'Delete it and try the sample' }).click();
    await expect(page.getByText(/Let's personalize this invitation/)).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('veidne_session'))).toBeNull();
  });

  test('Continue after the finished-example link keeps the project', async ({ page }) => {
    await page.goto('/editor?flow=instant&src=hero_mockup');
    await expect(page.getByText('Starting the sample deletes this project.')).toBeVisible();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('NAME', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/editor$/);
  });

  test('Continue uses the product primary style and the drop zone matches the start screen', async ({ page }) => {
    await page.goto('/editor');
    const cont = page.getByRole('button', { name: 'Continue', exact: true });
    const browse = page.getByRole('button', { name: 'Browse files' });
    await expect(cont).toBeVisible();
    const contBg = await cont.evaluate((el) => getComputedStyle(el).backgroundColor);
    const browseBg = await browse.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(contBg).toBe(browseBg);
    expect((await browse.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await cont.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByText('Supported formats: .docx, .xlsx, .xls')).toBeVisible();
    await expect(page.getByText('Files stay on your device.')).toBeVisible();
  });

  test('a spreadsheet dropped on the resume screen starts the data-first path', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('input[type="file"]').setInputFiles(xlsxOf([{ Name: 'Liga' }]));
    await expect(page.getByText('Upload your template')).toBeVisible();
    await expect(page.getByText('You have an unfinished project')).toHaveCount(0);
  });
});

test.describe('resume from the column step', () => {
  test.beforeEach(async ({ page }) => {
    const docx = await makeDocx('Dear {{NAME}} welcome');
    await page.addInitScript(({ b64 }) => {
      localStorage.setItem('veidne_session', JSON.stringify({
        sourceFileName: 'letter.docx', documentHtml: '', rawDocxBase64: b64,
        placeholders: [{ id: 'ph-1', name: 'NAME', originalText: '{{NAME}}', colorIndex: 0, occurrences: [] }],
        editorPhase: 'mapping', dataSubState: 'mapping', kitDownloaded: false, savedAt: Date.now(),
      }));
    }, { b64: docx.buffer.toString('base64') });
  });

  // The spreadsheet is never saved, so the column step cannot come back as it was.
  test('a project saved in the column dialog resumes in the preview, which asks for the data', async ({ page }) => {
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('No data to preview yet.', { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('reflow', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('at 320 px nothing in the preview is wider than the screen', async ({ page }) => {
    await toPreview(page, 'Name');
    await page.getByRole('button', { name: 'Looks good' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Generate/ })).toBeVisible({ timeout: 15_000 });
    // The preview panel slides 16 px in while its values appear (J19), so
    // measure once the reveal has finished.
    const wider = () => page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .filter((el) => !el.closest('[aria-hidden="true"], [inert]'))
      .map((el) => el.tagName.toLowerCase() + ' ' + (el.textContent || '').trim().slice(0, 40)));
    await expect.poll(wider, { timeout: 5_000 }).toEqual([]);
  });
});
