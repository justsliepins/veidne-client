#!/usr/bin/env node
// After a deploy: fetches every prerendered page from the live site as a normal
// browser and as the main search and AI crawlers, and compares what they get
// with the snapshot of the build that was deployed.
//
//   node scripts/seo/live-check.mjs --snapshot <deployed-build.json> [--origin https://veidne.com] [--dist dist]
//
// For each route and user agent: HTTP status must be 200; title, meta
// description, meta robots, canonical, JSON-LD, h1, text chunks and links must
// equal the snapshot; and the HTML must not mention /cdn-cgi/ (a CDN feature
// such as email obfuscation or Rocket Loader rewriting the page at the edge).
// robots.txt and sitemap.xml must equal the files in dist/ (when --dist is given).
// A 403, 429 or 503, or a page that looks like a bot challenge, is reported as
// INCONCLUSIVE: a CDN may challenge a spoofed crawler user agent that comes from
// an ordinary IP address, which says nothing about the real crawler. Confirm
// those in the CDN's bot analytics instead. A stale page usually means the CDN
// cache was not purged after the deploy.

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { launchBrowser, extractPage } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const snapPath = opt('--snapshot');
const origin = (opt('--origin', 'https://veidne.com') || '').replace(/\/$/, '');
const distDir = opt('--dist') ? resolve(opt('--dist')) : null;
if (!snapPath) {
  console.error('usage: node scripts/seo/live-check.mjs --snapshot <deployed-build.json> [--origin https://veidne.com] [--dist dist]');
  process.exit(2);
}

const AGENTS = {
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
  ClaudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

const snap = JSON.parse(await readFile(snapPath, 'utf8'));
const browser = await launchBrowser();
const context = await browser.newContext();
await context.route('**/*', (r) => r.abort());
const lines = [];
let failures = 0;
let inconclusive = 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fields = (p) => ({
  title: p.title,
  description: p.meta['name:description'] ?? null,
  robots: p.meta['name:robots'] ?? null,
  canonical: (p.headLinks.find((l) => (l.rel || '').toLowerCase() === 'canonical') || {}).href ?? null,
  jsonld: p.jsonld,
  h1: p.headings.filter((h) => h.level === 1).map((h) => h.text),
  chunks: p.chunks,
  links: p.links,
});

try {
  for (const route of Object.keys(snap.routes)) {
    const expected = fields(snap.routes[route]);
    for (const [agent, ua] of Object.entries(AGENTS)) {
      let res;
      try {
        res = await fetch(origin + route, { headers: { 'user-agent': ua, accept: 'text/html' }, redirect: 'manual' });
      } catch (e) {
        failures += 1;
        lines.push(`FAIL  ${route}  ${agent}  request failed: ${e.message}`);
        continue;
      }
      const body = await res.text();
      if ([403, 429, 503].includes(res.status) || /cf-chl|challenge-platform|Just a moment\.\.\./i.test(body)) {
        inconclusive += 1;
        lines.push(`INCONCLUSIVE  ${route}  ${agent}  status ${res.status} (challenge or block for a spoofed user agent; check the CDN bot analytics)`);
        continue;
      }
      if (res.status !== 200) {
        failures += 1;
        lines.push(`FAIL  ${route}  ${agent}  status ${res.status}${res.headers.get('location') ? ' to ' + res.headers.get('location') : ''}`);
        continue;
      }
      const robotsHeader = res.headers.get('x-robots-tag');
      if (robotsHeader && /noindex|none/i.test(robotsHeader)) {
        failures += 1;
        lines.push(`FAIL  ${route}  ${agent}  X-Robots-Tag: ${robotsHeader}`);
      }
      if (/\/cdn-cgi\//i.test(body)) {
        failures += 1;
        lines.push(`FAIL  ${route}  ${agent}  the HTML mentions /cdn-cgi/: the CDN rewrites the page (turn off email obfuscation, Rocket Loader and similar)`);
      }
      const got = fields(await extractPage(context, body));
      const diffs = Object.keys(expected).filter((k) => !same(expected[k], got[k]));
      if (diffs.length) {
        failures += 1;
        lines.push(`FAIL  ${route}  ${agent}  differs from the build: ${diffs.join(', ')} (stale CDN cache, or a different build is live)`);
      } else {
        lines.push(`ok    ${route}  ${agent}  200, head, h1, text and links match the build`);
      }
    }
  }
  if (distDir) {
    for (const file of ['robots.txt', 'sitemap.xml']) {
      const local = await readFile(join(distDir, file), 'utf8');
      const res = await fetch(`${origin}/${file}`, { headers: { 'user-agent': AGENTS.browser } });
      const live = await res.text();
      if (res.status !== 200 || live.trim() !== local.trim()) {
        failures += 1;
        lines.push(`FAIL  /${file}  status ${res.status}, ${live.trim() === local.trim() ? 'same content' : 'content differs from dist'}`);
      } else {
        lines.push(`ok    /${file}  200, same as dist`);
      }
    }
  }
} finally {
  await browser.close();
}
console.log(`live check of ${origin}: ${failures} failures, ${inconclusive} inconclusive`);
console.log(lines.join('\n'));
process.exit(failures ? 1 : 0);
