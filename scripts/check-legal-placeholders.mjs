// Release gate for the privacy notice, the accessibility page and the footer
// operator line. Facts only the operator or a lawyer can supply are written as
// "[TO FILL: ...]" in src/i18n/locales/en.json. Run after `npm run build`:
// it lists every placeholder left in the prerendered HTML and exits 1, so a
// draft cannot be deployed by accident. Not part of `npm run build`, so other
// fixes can still be built while the legal text is being completed.
//
// Plain .mjs (not under src/), like prerender.mjs: free to use node:fs and
// outside the app TypeScript project and the ESLint scope.

import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

const MARK = '[TO FILL:';
const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

async function main() {
  let found = 0;
  for (const file of await htmlFiles(distDir)) {
    const html = await readFile(file, 'utf8');
    for (const m of html.matchAll(/\[TO FILL:[^\]]*\]/g)) {
      found += 1;
      console.log(`${relative(distDir, file)}: ${m[0]}`);
    }
  }
  if (found > 0) {
    console.error(`[check-legal] ${found} placeholder(s) starting with "${MARK}" are still in dist. Fill them in en.json before deploying.`);
    process.exitCode = 1;
  } else {
    console.log('[check-legal] no placeholders left in dist.');
  }
}

main().catch((err) => {
  console.error('[check-legal] failed:', err);
  process.exitCode = 1;
});
