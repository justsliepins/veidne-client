import { test, expect } from '@playwright/test';

// H14: public pages do not load the editor's spreadsheet and Word libraries.
// In the dev server those libraries are served as pre-bundled dependencies
// (node_modules/.vite/deps/xlsx.js and so on), so a request whose URL names
// one of them means a public page pulled in editor code again.
const BASE = 'http://localhost:5181';
const EDITOR_LIBS = /\/(xlsx|docxtemplater|pizzip|jszip)[.\-_/]/;

for (const path of ['/', '/about', '/privacy', '/free-online-mail-merge']) {
  test(`${path} loads no spreadsheet or Word library`, async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState('networkidle');
    expect(urls.filter((u) => EDITOR_LIBS.test(new URL(u).pathname))).toEqual([]);
  });
}
