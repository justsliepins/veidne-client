import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { test, expect, type Page } from '@playwright/test';

// Privacy canary: Veidne's promise is that user files and their contents never
// leave the browser (the explicit, opt-in PDF export is the one documented
// exception and is deliberately not triggered here: this runs against the
// dark-launch server, where the PDF feature is absent). This spec drives the
// full real merge flow with the committed fixtures while watching every
// outbound request of the whole browser context, and fails if
//   - any request goes to an origin other than the dev server,
//   - any request URL, header or body carries a string from the fixture files,
//   - any request body carries file bytes (raw, base64 or as a zip), is not a
//     small JSON document, or cannot be read at all,
//   - any WebSocket, worker, service worker or second tab is opened, or
//   - an analytics body has an unexpected shape or event name.
// Every check below can fail; see the README for how that was exercised.
const BASE = 'http://localhost:5181';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');
const DATA = path.join(FIXTURES, 'veidne-format-test-data.xlsx');

// Hand-picked strings that exist only inside the fixture files: a row value, a
// diacritic surname, a numeric cell, the template heading, a column header, a
// formatted zip. fixtureStrings() adds every other cell value and text run.
const SENTINELS = ['Anna Ozola', 'Bērziņš', '2283.11', 'REIMBURSEMENT', 'TRUEDATE', '02451'];

// The fixture bytes themselves, raw and base64, so that a body carrying the
// file (whose zip-compressed content shows none of the strings) is caught.
const FIXTURE_BYTES = [TEMPLATE, DATA].map((f) => fs.readFileSync(f));
const FIXTURE_BASE64 = FIXTURE_BYTES.map((b) => b.toString('base64'));
const ZIP_SIGNATURE = Buffer.from('PK\u0003\u0004', 'latin1');

// Nothing in this flow legitimately sends more than a few small analytics
// bodies, so both a single large body and many small ones are failures.
const MAX_BODY_BYTES = 4096;
const MAX_TOTAL_BODY_BYTES = 16384;

// Events the flow must have reported before the checks run, so that a leak
// added to one of them cannot slip past because the request was still in
// flight. The full union lives in src/services/analyticsService.ts.
const REQUIRED_EVENTS = ['page_view', 'document_uploaded', 'excel_uploaded', 'generate_started', 'generate_completed'];
const KNOWN_EVENTS = new Set([
  'page_view', 'matrix_selection', 'document_uploaded', 'placeholder_created',
  'excel_uploaded', 'generate_started', 'generate_completed', 'template_downloaded',
  'template_selected', 'kit_downloaded', 'donation_initiated', 'suggestion_submitted',
  'roadmap_voted', 'demo_started', 'instant_preview_opened', 'instant_preview_swapped',
  'session_restored', 'bug_report_submitted', 'pdf_started', 'pdf_generated',
  'image_field_created', 'images_added', 'image_match',
  'review_g2_clicked', 'review_trustpilot_clicked', 'review_line_clicked',
  'download_modal_shown', 'donation_ask_shown', 'review_ask_shown',
]);

function sameOrigin(url: string): boolean {
  try { return new URL(url).origin === BASE; } catch { return false; }
}

function safeDecode(text: string): string {
  try { return decodeURIComponent(text.replace(/\+/g, ' ')); } catch { return text; }
}

// Every distinct string of four or more characters in the spreadsheet (raw and
// as formatted) and in the template's text runs, plus the hand-picked ones.
async function fixtureStrings(): Promise<string[]> {
  const out = new Set(SENTINELS);
  const wb = XLSX.read(FIXTURE_BYTES[1], { type: 'buffer' });
  for (const name of wb.SheetNames) {
    for (const raw of [true, false]) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw });
      for (const row of rows) for (const v of row) {
        const s = String(v ?? '').trim();
        if (s.length >= 4) out.add(s);
      }
    }
  }
  const zip = await JSZip.loadAsync(FIXTURE_BYTES[0]);
  const xml = await zip.file('word/document.xml')!.async('string');
  for (const m of xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)) {
    const s = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
    if (s.length >= 4) out.add(s);
  }
  return [...out];
}

// Match a fixture string in plain, percent-encoded and form-encoded form.
// All-digit strings must stand alone, so a timestamp or hash that happens to
// contain the digits is not a false positive.
function findSentinel(text: string, sentinels: string[]): string | null {
  const decoded = safeDecode(text);
  for (const s of sentinels) {
    if (/^\d+$/.test(s)) {
      const re = new RegExp(`(^|[^0-9])${s}([^0-9]|$)`);
      if (re.test(text) || re.test(decoded)) return s;
    } else if (text.includes(s) || decoded.includes(s) || text.includes(encodeURIComponent(s))) {
      return s;
    }
  }
  return null;
}

function describeBodyLeak(body: Buffer, sentinels: string[]): string | null {
  if (body.length > MAX_BODY_BYTES) return `body of ${body.length} bytes exceeds ${MAX_BODY_BYTES}`;
  if (body.includes(ZIP_SIGNATURE)) return 'body contains a zip (docx/xlsx) signature';
  for (const [i, bytes] of FIXTURE_BYTES.entries()) {
    const which = i === 0 ? 'template' : 'spreadsheet';
    if (body.includes(bytes)) return `body contains the raw ${which} fixture`;
    if (body.includes(FIXTURE_BASE64[i])) return `body contains the base64 ${which} fixture`;
  }
  const hit = findSentinel(body.toString('utf8'), sentinels);
  if (hit) return `body contains fixture string "${hit}"`;
  return null;
}

// Service workers could make requests that routing does not see; forbid them.
test.use({ serviceWorkers: 'block' });

test('privacy canary: full merge flow sends no document content anywhere', async ({ page, context }) => {
  const sentinels = await fixtureStrings();
  expect(sentinels.length).toBeGreaterThan(SENTINELS.length);

  const captured: { url: string; method: string; body: Buffer | null; headers: Record<string, string> }[] = [];
  const analyticsBodies: string[] = [];
  const thirdPartyUrls: string[] = [];
  const sockets: string[] = [];

  // Capture every outbound request of the whole context, with its raw body
  // bytes and headers, and every WebSocket, including those of any extra page.
  context.on('request', (req) => {
    captured.push({ url: req.url(), method: req.method(), body: req.postDataBuffer(), headers: req.headers() });
  });
  const watchSockets = (p: Page) => p.on('websocket', (ws) => sockets.push(ws.url()));
  watchSockets(page);
  context.on('page', watchSockets);

  // Hermetic routing: analytics is fulfilled locally, every other-origin
  // request is recorded and then aborted.
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (sameOrigin(url) && new URL(url).pathname === '/api/analytics') {
      analyticsBodies.push(route.request().postData() ?? '');
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (sameOrigin(url)) return route.continue();
    thirdPartyUrls.push(url);
    return route.abort();
  });

  // The full real flow: upload, mapping, preview, page records, generate, download.
  await page.goto(`${BASE}/start`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(DATA);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  // Sanity guard: the sentinels really are on screen, so a clean request log
  // means the content stayed local, not that the flow never loaded it.
  await expect(page.getByTestId('document-area')).toContainText('Anna Ozola');
  await expect(page.getByTestId('document-area')).toContainText('REIMBURSEMENT');

  await page.getByText('1 of 3', { exact: true }).locator('..').locator('button').nth(1).click();
  await expect(page.getByTestId('document-area')).toContainText('Jānis Bērziņš');
  await page.getByText('2 of 3', { exact: true }).locator('..').locator('button').nth(0).click();
  await expect(page.getByText('1 of 3', { exact: true })).toBeVisible();

  await page.getByLabel('Name files by').click();
  await page.getByRole('option', { name: 'NAME' }).click();
  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });

  // Download happens via a local blob: URL, not a network request.
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByText('Anna_Ozola.docx', { exact: true }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Anna_Ozola.docx');

  // Let the trailing analytics of the flow arrive before judging the log, and
  // insist that the flow really reported the file-handling events.
  const seenEvents = () => analyticsBodies.map((b) => { try { return (JSON.parse(b) as { event: string }).event; } catch { return ''; } });
  await expect.poll(() => REQUIRED_EVENTS.every((e) => seenEvents().includes(e)), { timeout: 10_000 }).toBe(true);
  await page.waitForLoadState('networkidle');

  // 1. Nothing else can carry traffic: one tab, no workers, no service worker.
  expect(context.pages().map((p) => p.url()), 'extra pages were opened').toHaveLength(1);
  expect(page.workers().map((w) => w.url()), 'web workers were started').toEqual([]);
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))).toBe(0);

  // 2. No request leaves this origin. Every other-origin URL is recorded by the
  // route handler before being aborted, so this list must be empty; a failure
  // names the offending URLs. WebSockets are checked separately because
  // routing does not see them; the only legitimate one is Vite's own.
  expect(thirdPartyUrls, `requests to other origins: ${thirdPartyUrls.join(', ')}`).toEqual([]);
  for (const r of captured) {
    expect(sameOrigin(r.url), `request to another origin: ${r.url}`).toBe(true);
  }
  for (const u of sockets) {
    expect(new URL(u).host, `WebSocket to another host: ${u}`).toBe(new URL(BASE).host);
  }

  // 3. No request URL or header carries a fixture string.
  expect(captured.length).toBeGreaterThan(0);
  for (const r of captured) {
    const urlHit = findSentinel(r.url, sentinels);
    expect(urlHit, `fixture string "${urlHit}" in URL ${r.url.slice(0, 140)}`).toBeNull();
    const headerHit = findSentinel(JSON.stringify(r.headers), sentinels);
    expect(headerHit, `fixture string "${headerHit}" in headers of ${r.url.slice(0, 140)}`).toBeNull();
  }

  // 4. The only requests with a body are JSON posts to /api/analytics, every
  // body is readable (a Blob, File or stream body would not be), small, valid
  // JSON, and free of file bytes and fixture strings, in total as well as each.
  let totalBodyBytes = 0;
  for (const r of captured) {
    const where = `${r.method} ${r.url.slice(0, 140)}`;
    if (r.method === 'GET' || r.method === 'HEAD') {
      expect(r.body?.length ?? 0, `${where} carried a body`).toBe(0);
      continue;
    }
    expect(r.method, `${where}: only POST is expected`).toBe('POST');
    expect(new URL(r.url).pathname, `${where}: a post to something other than analytics`).toBe('/api/analytics');
    expect(r.body, `${where}: body could not be read (Blob, File, FormData with a file, or stream)`).not.toBeNull();
    const body = r.body as Buffer;
    totalBodyBytes += body.length;
    const leak = describeBodyLeak(body, sentinels);
    expect(leak, `${where}: ${leak}`).toBeNull();
    expect((r.headers['content-type'] ?? '').toLowerCase().startsWith('application/json'), `${where}: content type ${r.headers['content-type']}`).toBe(true);
    expect(() => JSON.parse(body.toString('utf8')), `${where}: body is not JSON`).not.toThrow();
  }
  expect(totalBodyBytes, 'total bytes posted during the flow').toBeLessThan(MAX_TOTAL_BODY_BYTES);

  // 5. Analytics bodies are metadata-only: {event, data?, timestamp} with a
  // known event name and a small, sentinel-free data object.
  expect(analyticsBodies.length).toBeGreaterThan(0);
  for (const body of analyticsBodies) {
    const parsed = JSON.parse(body) as { event: string; data?: unknown; timestamp: number };
    expect(KNOWN_EVENTS.has(parsed.event), `unknown analytics event: ${parsed.event}`).toBe(true);
    expect(typeof parsed.timestamp).toBe('number');
    expect(Object.keys(parsed).every((k) => ['event', 'data', 'timestamp'].includes(k))).toBe(true);
    if (parsed.data !== undefined) {
      expect(parsed.data).toEqual(expect.any(Object));
      const dataStr = JSON.stringify(parsed.data);
      expect(dataStr.length, `analytics data unexpectedly large: ${dataStr.slice(0, 100)}`).toBeLessThan(500);
      expect(findSentinel(dataStr, sentinels)).toBeNull();
    }
  }
});
