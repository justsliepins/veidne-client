// GEO step-1 static prerender driver.
//
// Runs as a postbuild step (see package.json "build"). It imports the
// self-contained Vite SSR bundle of src/prerender/render.tsx (built with
// ssr.noExternal: true), renders each use-case route to static markup, and
// writes per-route HTML into the client build output so nginx's SPA fallback
// (try_files $uri $uri/ /index.html) serves dist/<route>/index.html for
// /<route>. No headless browser is involved.
//
// Plain .mjs (not under src/) so it is free to use node:fs and is excluded from
// the app TypeScript project and from ESLint's **/*.{ts,tsx} lint scope.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { prerenderRoutes, renderRoute } from '../dist-ssr/render.js';
import { jsonLdByPath } from './usecase-jsonld.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const clientRoot = join(here, '..');
const distDir = join(clientRoot, 'dist');

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(template, route, appHtml, styleHtml) {
  const url = `https://veidne.com${route.path}`;
  const title = escapeAttr(route.title);
  const description = escapeAttr(route.description);

  let html = template;

  // Visible app content (replaces the empty SPA mount point).
  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  // Per-page <title> and the title-bearing social meta.
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`);

  // Per-page description across the three description metas.
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${description}$2`);

  // Per-page canonical and og:url (kept precise so og:image is not touched).
  html = html.replace(/(<link rel="canonical" href=")https:\/\/veidne\.com\/(")/, `$1${url}$2`);
  html = html.replace(/(<meta property="og:url" content=")https:\/\/veidne\.com\/(")/, `$1${url}$2`);

  // Per-page JSON-LD: replace the id="jsonld-main"-marked canonical @graph
  // inherited from index.html with this route's own @graph, keeping the marker.
  // Routes without a jsonLdByPath entry (/start) keep the template's canonical
  // 3-node graph untouched. A replacement function avoids $-pattern
  // interpretation in the JSON payload.
  const jsonLd = jsonLdByPath[route.path];
  if (jsonLd) {
    const jsonLdScript = `<script type="application/ld+json" id="jsonld-main">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
    html = html.replace(/<script type="application\/ld\+json" id="jsonld-main">[\s\S]*?<\/script>/, () => jsonLdScript);
  }

  // Griffel styles collected during SSR, injected before </head>.
  html = html.replace('</head>', `${styleHtml}</head>`);

  return html;
}

async function main() {
  const template = await readFile(join(distDir, 'index.html'), 'utf8');

  for (const route of prerenderRoutes) {
    const { appHtml, styleHtml } = await renderRoute(route);
    const html = buildHtml(template, route, appHtml, styleHtml);
    const outDir = join(distDir, route.path.replace(/^\/+/, ''));
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'index.html'), html, 'utf8');
    console.log(`prerendered ${route.path} -> dist${route.path}/index.html`);
  }
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exitCode = 1;
});
