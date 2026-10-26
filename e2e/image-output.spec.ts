import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { test, expect, type Page } from '@playwright/test';

// Image output (Task 14): per-row transcode and media swap, behind the flag.
// The owner fixtures cover every acceptance case: three JPEG aspect ratios,
// a 3000 px webp, a gif, an alpha png, and a missing file for the no-picture
// rule. Outputs are unzipped in-spec and the media, extents, and formats are
// asserted byte-level; XML well-formedness stands proxy for opening in Word.
const ON = 'http://localhost:5173';
const OFF = 'http://localhost:5181';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE_C = path.join(FIXTURES, 'veidne-image-template-C-pretagged.docx');
const TEXT_TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');
const TEXT_DATA = path.join(FIXTURES, 'veidne-format-test-data.xlsx');
const DATA_XLSX = path.join(FIXTURES, 'veidne-image-test-data.xlsx');
const IMAGES_ZIP = path.join(FIXTURES, 'images.zip');

// Template C's sample box, from its wp:extent.
const BOX_CX = 1047750;
const BOX_CY = 1323975;
const EMU_PER_PX = 9525;
const TRANSPARENT_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

// ── binary helpers ──────────────────────────────────────────────────────────

function isPng(b: Buffer): boolean { return b.subarray(0, 8).equals(Buffer.from('\x89PNG\r\n\x1a\n', 'latin1')); }
function isJpeg(b: Buffer): boolean { return b[0] === 0xff && b[1] === 0xd8; }
function isWebp(b: Buffer): boolean { return b.subarray(0, 4).toString() === 'RIFF'; }

function pngInfo(b: Buffer): { w: number; h: number; colorType: number } {
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

function jpegDims(b: Buffer): { w: number; h: number } {
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd9)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('no SOF marker');
}

function mediaDims(b: Buffer): { w: number; h: number } {
  if (isPng(b)) { const { w, h } = pngInfo(b); return { w, h }; }
  if (isJpeg(b)) return jpegDims(b);
  throw new Error('not png or jpeg');
}

interface PhotoExtract { media: Buffer; cx: number; cy: number; nameText: string }

/** The PHOTO drawing's media bytes and extents from one generated docx. */
async function extractPhoto(docx: Buffer): Promise<PhotoExtract> {
  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file('word/document.xml')!.async('string');
  const segment = xml.match(/<w:drawing\b[\s\S]*?<\/w:drawing>/g)!
    .find((s) => s.includes('descr="{{PHOTO}}"'))!;
  const relId = segment.match(/r:embed="([^"]+)"/)![1];
  const rels = await zip.file('word/_rels/document.xml.rels')!.async('string');
  const target = rels.match(new RegExp(`<Relationship[^>]*Id="${relId}"[^>]*Target="([^"]+)"`))![1];
  const media = await zip.file(`word/${target.replace(/^\.\//, '')}`)!.async('nodebuffer');
  const ext = segment.match(/<wp:extent cx="(\d+)" cy="(\d+)"/)!;
  return { media, cx: parseInt(ext[1], 10), cy: parseInt(ext[2], 10), nameText: xml };
}

async function runFlow(page: Page, dataFile: Parameters<Page['setInputFiles']> extends never ? never : string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('image-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]:not([data-testid="image-intake-input"])').setInputFiles(dataFile);
  await page.getByRole('button', { name: 'Looks good' }).click();
  // The guided Pictures step fires here: add the photos right in it.
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toBeVisible();
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await expect(page.getByTestId('image-match-panel').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
}

async function downloadAllDocs(page: Page): Promise<Map<string, Buffer>> {
  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Download Word files' }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(readFileSync((await download.path())!));
  const docs = new Map<string, Buffer>();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir && name.endsWith('.docx')) docs.set(name, await entry.async('nodebuffer'));
  }
  return docs;
}

test('per-row media, formats, fit-rule extents, placeholder row', async ({ page }) => {
  test.setTimeout(120_000);
  await runFlow(page, DATA_XLSX);
  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 60_000 });

  const docs = await downloadAllDocs(page);
  expect(docs.size).toBe(7);

  // Identify each document by the NAME it carries.
  const byPerson = new Map<string, PhotoExtract>();
  for (const buf of docs.values()) {
    const ex = await extractPhoto(buf);
    for (const person of ['Anna Ozola', 'Jānis Bērziņš', 'Žaklīna Šmite', 'Pēteris Kalniņš', 'Petra Liepa', 'Otto Ozols', 'Mārtiņš Egle']) {
      if (ex.nameText.includes(person) && !byPerson.has(person)) { byPerson.set(person, ex); break; }
    }
  }
  expect(byPerson.size).toBe(7);

  const sourceAspect: Record<string, number> = {
    'Anna Ozola': 600 / 800,        // portrait jpeg
    'Jānis Bērziņš': 900 / 500,     // wide jpeg (janis.JPG case trap)
    'Žaklīna Šmite': 500 / 500,     // square png with alpha
    'Pēteris Kalniņš': 3000 / 2000, // the 3000 px webp
    'Petra Liepa': 400 / 300,       // gif
    'Otto Ozols': 600 / 800,        // shares anna.jpg via trailing-space cell
  };

  for (const [person, aspect] of Object.entries(sourceAspect)) {
    const ex = byPerson.get(person)!;
    // Only JPEG and PNG are ever embedded.
    expect(isPng(ex.media) || isJpeg(ex.media), `${person}: media is png or jpeg`).toBe(true);
    expect(isWebp(ex.media), `${person}: never webp`).toBe(false);
    // Fit rule: inside the box (1 percent tolerance), aspect preserved, and
    // the binding axis touches the box.
    expect(ex.cx).toBeLessThanOrEqual(BOX_CX * 1.01);
    expect(ex.cy).toBeLessThanOrEqual(BOX_CY * 1.01);
    expect(Math.abs(ex.cx / ex.cy - aspect) / aspect, `${person}: aspect`).toBeLessThan(0.01);
    const touches = ex.cx >= BOX_CX * 0.99 || ex.cy >= BOX_CY * 0.99;
    expect(touches, `${person}: fills the box on one axis`).toBe(true);
    // Media pixel dimensions stay under the hard cap.
    const dims = mediaDims(ex.media);
    expect(Math.max(dims.w, dims.h)).toBeLessThanOrEqual(1600);
  }

  // Three different aspect ratios produce three different media payloads;
  // rows 1 and 6 share anna.jpg and therefore identical transcoded bytes.
  const h = (b: Buffer) => b.toString('base64').slice(0, 40) + b.length;
  expect(h(byPerson.get('Anna Ozola')!.media)).toBe(h(byPerson.get('Otto Ozols')!.media));
  const distinct = new Set([
    h(byPerson.get('Anna Ozola')!.media),
    h(byPerson.get('Jānis Bērziņš')!.media),
    h(byPerson.get('Žaklīna Šmite')!.media),
  ]);
  expect(distinct.size).toBe(3);

  // The alpha png stays png with an alpha-capable color type.
  const zak = byPerson.get('Žaklīna Šmite')!;
  expect(isPng(zak.media)).toBe(true);
  expect([4, 6]).toContain(pngInfo(zak.media).colorType);

  // The gif converted.
  const petra = byPerson.get('Petra Liepa')!;
  expect(isPng(petra.media) || isJpeg(petra.media)).toBe(true);

  // No-picture row: the transparent pixel stretched to the full sample box,
  // drawing intact.
  const martins = byPerson.get('Mārtiņš Egle')!;
  expect(martins.media.equals(TRANSPARENT_PIXEL_PNG)).toBe(true);
  expect(martins.cx).toBe(BOX_CX);
  expect(martins.cy).toBe(BOX_CY);

  // Every document still parses: well-formed XML as the open-in-Word proxy.
  for (const ex of byPerson.values()) {
    expect(ex.nameText.includes('</w:document>')).toBe(true);
  }
});

test('zero image fields: flag-on output is byte-identical to flag-off', async ({ page, browser }) => {
  test.setTimeout(120_000);
  async function generateOne(base: string): Promise<Map<string, string>> {
    const p = await browser.newPage();
    await p.route('**/api/analytics', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.goto(`${base}/editor`);
    await p.locator('input[type="file"]').setInputFiles(TEXT_TEMPLATE);
    await p.getByRole('button', { name: 'Add your data' }).click();
    await p.locator('input[type="file"]:not([data-testid="image-intake-input"])').setInputFiles(TEXT_DATA);
    await p.getByRole('button', { name: 'Looks good' }).click();
    await expect(p.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
    await p.getByLabel('Name files by').click();
    await p.getByRole('option', { name: 'NAME' }).click();
    await p.getByRole('button', { name: /Generate/ }).click();
    await expect(p.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
    // Download-all works on both done surfaces (classic list and PDF flow).
    const dl = p.waitForEvent('download', { timeout: 60_000 });
    await p.getByRole('button', { name: 'Download Word files' }).click();
    const bundle = await JSZip.loadAsync(readFileSync((await (await dl).path())!));
    const entries = new Map<string, string>();
    for (const [docName, docEntry] of Object.entries(bundle.files)) {
      if (docEntry.dir || !docName.endsWith('.docx')) continue;
      const inner = await JSZip.loadAsync(await docEntry.async('nodebuffer'));
      for (const [name, entry] of Object.entries(inner.files)) {
        if (!entry.dir) entries.set(`${docName}::${name}`, (await entry.async('nodebuffer')).toString('base64'));
      }
    }
    await p.close();
    return entries;
  }
  void page;
  const on = await generateOne(ON);
  const off = await generateOne(OFF);
  expect([...on.keys()].sort()).toEqual([...off.keys()].sort());
  for (const [name, content] of on) {
    expect(off.get(name), `entry ${name} differs between flag on and off`).toBe(content);
  }
});

test('200 rows reusing the six photos: wall time and heap', async ({ page }) => {
  test.setTimeout(300_000);
  const photos = ['anna.jpg', 'janis.jpg', 'zaklina', 'bigphoto.webp', 'petra.gif', 'anna.jpg '];
  const rows = Array.from({ length: 200 }, (_, i) => ({
    NAME: `Person ${String(i + 1).padStart(3, '0')}`,
    COURSE: 'Bulk Course', DATE: '2026-06-11',
    PHOTO: photos[i % photos.length],
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  await runFlow(page, { name: 'bulk.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });

  // Sample the JS heap every 500 ms for the duration of the run.
  await page.evaluate(() => {
    const w = window as unknown as { __heap: number[]; __heapTimer: number };
    w.__heap = [];
    w.__heapTimer = window.setInterval(() => {
      const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (m) w.__heap.push(m.usedJSHeapSize);
    }, 500);
  });

  const t0 = Date.now();
  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 180_000 });
  const generateMs = Date.now() - t0;

  const t1 = Date.now();
  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
  await page.getByRole('button', { name: 'Download Word files' }).click();
  await (await downloadPromise).path();
  const zipMs = Date.now() - t1;

  const peakHeap = await page.evaluate(() => {
    const w = window as unknown as { __heap: number[]; __heapTimer: number };
    clearInterval(w.__heapTimer);
    return Math.max(...w.__heap, 0);
  });

  console.log(`PERF generate 200 rows: ${generateMs} ms; download zip build: ${zipMs} ms; peak sampled JS heap: ${(peakHeap / 1048576).toFixed(1)} MB`);
  expect(generateMs).toBeLessThan(120_000);
  expect(peakHeap).toBeLessThan(400 * 1048576);
});

test('the Generate preview shows each row\'s matched photo fitted in the box', async ({ page }) => {
  await runFlow(page, DATA_XLSX);

  // Row 1 (Anna): her actual photo, object URL, fitted inside the sample box.
  const docArea = page.getByTestId('document-area');
  const img = docArea.getByTestId('doc-image').first();
  await expect(img).toBeVisible();
  const src = await img.getAttribute('src');
  expect(src).toMatch(/^blob:/);
  const box = await img.boundingBox();
  // Sample box is 110 x 139 px; anna.jpg is portrait 3:4, so it fills the
  // height and stays narrower than the box width.
  expect(box!.height).toBeGreaterThan(125);
  expect(box!.height).toBeLessThan(150);
  expect(box!.width).toBeLessThan(115);
  const aspect = box!.width / box!.height;
  expect(Math.abs(aspect - 600 / 800)).toBeLessThan(0.05);

  // Walk to row 7 (Martins, no picture): the box reads as empty.
  for (let i = 1; i < 7; i++) {
    await page.getByText(`${i} of 7`, { exact: true }).locator('..').locator('button').nth(1).click();
  }
  await expect(docArea.getByTestId('doc-image-empty')).toBeVisible();
  await expect(docArea.getByTestId('doc-image')).toHaveCount(0);
});
