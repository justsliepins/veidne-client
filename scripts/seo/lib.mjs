// Shared code for the SEO and AI-crawlability checks.
//
// What a crawler that does not run JavaScript sees is the static HTML that
// `npm run build` writes into dist/. These helpers read that HTML, remove every
// executable script (JSON-LD blocks stay, they are data), block all network
// requests, and let Chromium parse the markup. Nothing here needs a server or
// the API. The only dependency is Playwright, which the repo already has as a
// devDependency for its e2e tests.
//
// Set SEO_CHROMIUM to a Chromium binary path if Playwright cannot find its own.

import { readFile, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname, normalize, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

export async function launchBrowser() {
  const executablePath = process.env.SEO_CHROMIUM || undefined;
  return chromium.launch({ executablePath });
}

// Every index.html under dist/ is a route ("/" for dist/index.html).
export async function discoverRoutes(distDir) {
  const routes = [];
  async function walk(dir, rel) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (rel === '' && entry.name === 'assets') continue;
        await walk(join(dir, entry.name), rel + '/' + entry.name);
      } else if (entry.name === 'index.html') {
        routes.push(rel === '' ? '/' : rel);
      }
    }
  }
  await walk(distDir, '');
  return routes.sort();
}

export function routeFile(distDir, route) {
  return route === '/' ? join(distDir, 'index.html') : join(distDir, route.replace(/^\/+/, ''), 'index.html');
}

const EXECUTABLE_SCRIPT = /<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi;

/** Parse one static HTML document with scripts removed and the network blocked. */
export async function extractPage(context, html) {
  const page = await context.newPage();
  try {
    await page.setContent(html.replace(EXECUTABLE_SCRIPT, ''), { waitUntil: 'domcontentloaded' });
    return await page.evaluate(() => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const meta = {};
      for (const m of document.querySelectorAll('meta[name], meta[property]')) {
        const key = m.getAttribute('name') ? `name:${m.getAttribute('name')}` : `property:${m.getAttribute('property')}`;
        meta[key] = m.getAttribute('content');
      }
      const headLinks = [...document.querySelectorAll('head link')]
        .filter((l) => ['canonical', 'alternate', 'icon'].includes((l.getAttribute('rel') || '').toLowerCase()))
        .map((l) => ({ rel: l.getAttribute('rel'), href: l.getAttribute('href'), hreflang: l.getAttribute('hreflang') }));
      const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
        try {
          return { id: s.id || null, data: JSON.parse(s.textContent) };
        } catch (e) {
          return { id: s.id || null, error: String(e) };
        }
      });
      const root = document.getElementById('root');
      const clone = root ? root.cloneNode(true) : document.createElement('div');
      clone.querySelectorAll('style,script,noscript,template').forEach((n) => n.remove());

      const headings = [...clone.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
        level: Number(h.tagName[1]),
        text: norm(h.textContent),
      }));
      const links = [...clone.querySelectorAll('a[href]')].map((a) => ({
        href: a.getAttribute('href'),
        text: norm(a.textContent) || norm(a.getAttribute('aria-label')),
        rel: a.getAttribute('rel') || null,
      }));
      const images = [...clone.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt') }));
      const ids = [...clone.querySelectorAll('[id]')].map((e) => e.id);

      // Text chunks: consecutive text nodes that share the same nearest block
      // ancestor form one chunk. Inline elements (span, strong, em, code) are
      // merged into their block, so a chunk reads like a sentence or a label.
      const BLOCK = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'DT', 'DD', 'FIGCAPTION',
        'BLOCKQUOTE', 'SUMMARY', 'BUTTON', 'A', 'LABEL', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV',
        'MAIN', 'ASIDE', 'FORM', 'TABLE', 'UL', 'OL', 'DL', 'DETAILS', 'FIGURE', 'CAPTION']);
      const chunks = [];
      let current = null;
      let currentBlock = null;
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let el = node.parentElement;
        while (el && el !== clone && !BLOCK.has(el.tagName)) el = el.parentElement;
        if (el !== currentBlock) {
          if (current !== null && norm(current)) chunks.push(norm(current));
          current = '';
          currentBlock = el;
        }
        current += node.textContent;
      }
      if (current !== null && norm(current)) chunks.push(norm(current));

      return {
        lang: document.documentElement.getAttribute('lang'),
        title: norm(document.title),
        meta,
        headLinks,
        jsonld,
        headings,
        links,
        images,
        ids,
        chunks,
      };
    });
  } finally {
    await page.close();
  }
}

export function words(text) {
  return text.split(/\s+/).filter(Boolean);
}

/** h1 text plus the first `n` words of text that follow the h1. */
export function leadOf(chunks, headings, n = 150) {
  const h1 = headings.find((h) => h.level === 1);
  if (!h1) return '';
  const start = chunks.findIndex((c) => c === h1.text || c.includes(h1.text));
  if (start < 0) return h1.text;
  const out = [];
  for (const c of chunks.slice(start + 1)) {
    out.push(...words(c));
    if (out.length >= n) break;
  }
  return `${h1.text} ${out.slice(0, n).join(' ')}`.trim();
}

function parseSitemap(xml) {
  const urls = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([\s\S]*?)<\/loc>/) || [])[1];
    const lastmod = (m[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1];
    urls.push({ loc: loc && loc.trim(), lastmod: lastmod ? lastmod.trim() : null });
  }
  return urls;
}

async function readIfExists(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

/** Snapshot of every prerendered route plus robots.txt, sitemap.xml and llms.txt. */
export async function snapshot(distDir) {
  const browser = await launchBrowser();
  const context = await browser.newContext();
  await context.route('**/*', (r) => r.abort());
  const routes = {};
  try {
    for (const route of await discoverRoutes(distDir)) {
      const html = await readFile(routeFile(distDir, route), 'utf8');
      const page = await extractPage(context, html);
      routes[route] = { ...page, htmlBytes: Buffer.byteLength(html), lead: leadOf(page.chunks, page.headings) };
    }
  } finally {
    await browser.close();
  }
  const sitemap = await readIfExists(join(distDir, 'sitemap.xml'));
  return {
    createdAt: new Date().toISOString(),
    distDir,
    routes,
    site: {
      robots: await readIfExists(join(distDir, 'robots.txt')),
      sitemap: sitemap === null ? null : parseSitemap(sitemap),
      llms: await readIfExists(join(distDir, 'llms.txt')),
    },
  };
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };

/** Static server for dist/ that answers like the production nginx: file, then dir/index.html, then /index.html. */
export async function serveDist(distDir) {
  const root = normalize(distDir);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = decodeURIComponent(url.pathname);
    const candidates = [join(root, path), join(root, path, 'index.html'), join(root, 'index.html')];
    for (const file of candidates) {
      if (!normalize(file).startsWith(root + sep) && normalize(file) !== root) continue;
      try {
        const s = await stat(file);
        if (!s.isFile()) continue;
        res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
        res.end(await readFile(file));
        return;
      } catch {
        /* try next */
      }
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

/** JS and CSS a real browser loads for `route` with JavaScript on, API calls blocked. Sizes from dist/, gzip level 9. */
export async function measureRoute(distDir, route) {
  const { server, origin } = await serveDist(distDir);
  const browser = await launchBrowser();
  const seen = new Set();
  try {
    const context = await browser.newContext();
    await context.route('**/*', (r) => {
      const u = new URL(r.request().url());
      if (u.origin !== origin || u.pathname.startsWith('/api/')) return r.abort();
      return r.continue();
    });
    const page = await context.newPage();
    page.on('request', (rq) => {
      const u = new URL(rq.url());
      if (u.origin === origin && /\.(js|css)$/.test(u.pathname)) seen.add(u.pathname);
    });
    await page.goto(origin + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  } finally {
    await browser.close();
    server.close();
  }
  const assets = [];
  for (const p of [...seen].sort()) {
    const buf = await readFile(join(distDir, p));
    assets.push({ path: p.replace(/-[A-Za-z0-9_-]{8}(?=\.(js|css)$)/, '-[hash]'), raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length });
  }
  const total = (k, ext) => assets.filter((a) => a.path.endsWith(ext)).reduce((s, a) => s + a[k], 0);
  return { route, assets, js: { raw: total('raw', '.js'), gzip: total('gzip', '.js') }, css: { raw: total('raw', '.css'), gzip: total('gzip', '.css') } };
}
