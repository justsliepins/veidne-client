#!/usr/bin/env node
// Writes the SEO and AI-crawlability snapshot of a built dist/ folder.
//
//   node scripts/seo/snapshot.mjs <distDir> <out.json>
//
// Run it after `npm run build` (see the build environment in the spec). The
// snapshot holds, per prerendered route: title, meta tags, canonical and other
// head links, parsed JSON-LD, the heading outline, every link and image, all
// static text as a crawler without JavaScript reads it, the lead (h1 plus the
// next 150 words), the element ids, the HTML size, and the JS and CSS a real
// browser downloads for the page. Site-wide: robots.txt, sitemap.xml, llms.txt.

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { snapshot, measureRoute } from './lib.mjs';

const [distArg, outArg] = process.argv.slice(2);
if (!distArg || !outArg) {
  console.error('usage: node scripts/seo/snapshot.mjs <distDir> <out.json>');
  process.exit(2);
}
const distDir = resolve(distArg);
const snap = await snapshot(distDir);
for (const route of Object.keys(snap.routes)) {
  snap.routes[route].assets = await measureRoute(distDir, route);
}
await writeFile(resolve(outArg), JSON.stringify(snap, null, 2) + '\n');
const summary = Object.entries(snap.routes).map(([r, p]) => `${r}  h1="${(p.headings.find((h) => h.level === 1) || {}).text}"  chunks=${p.chunks.length}  links=${p.links.length}  js.gzip=${p.assets.js.gzip}`);
console.log(`snapshot of ${Object.keys(snap.routes).length} routes written to ${outArg}`);
console.log(summary.join('\n'));
