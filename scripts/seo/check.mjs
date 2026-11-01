#!/usr/bin/env node
// Compares a built dist/ against the baseline snapshot and fails on anything
// the SEO contract does not allow.
//
//   node scripts/seo/check.mjs --baseline <baseline.json> --dist dist \
//     [--allow scripts/seo/allowed-changes.json] [--rules scripts/seo/rules.json] \
//     [--out <candidate.json>] [--report <report.json>] [--strict-unused] [--budget-strict]
//     [--skip-wp WPnn[,WPnn...]]
//
// Run from the repository root. Exit code 0 means every check passed.
// --strict-unused fails on allowlist entries that matched nothing, except entries
// marked "transient" (use it for the final check only). --budget-strict ignores the per-route percentage tolerance in rules.json (not the fixed CSS allowance)
// (final check: nothing may load more than the baseline).
//
// Checks:
//  1. No prerendered route disappears. A new route needs an approved register entry.
//  2. Title, meta tags, canonical, JSON-LD, h1, lang, robots.txt and sitemap URLs are
//     unchanged unless an entry with status "approved" lists the exact new value.
//     JSON-LD dateModified and sitemap lastmod may change with status "pre-approved".
//  3. Every text chunk, link, heading (h2 to h6) and image that is added or removed
//     is listed in the allowlist (status "spec" or "approved").
//  4. Key phrases from rules.json that the baseline page has are still on the page;
//     the homepage lead keeps every lead fact the baseline lead has.
//  5. Each FAQPage question and answer in JSON-LD appears in the page's visible text.
//  6. Internal links point to a prerendered route, to an allowed app route, to a file
//     in dist, or to a path that baseline already linked to; fragments resolve.
//  7. The pages that must stay noindex still pass noindex to PageSeo.
//  8. JS and CSS (gzip) that a browser loads for each budgeted route stay within the budget in rules.json,
//     and no prerendered page loads an asset named in rules.forbiddenAssets (the editor libraries).
//  9. Every page has exactly one h1 and parseable JSON-LD.

import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { snapshot, measureRoute } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(name);

const baselinePath = opt('--baseline');
const distDir = resolve(opt('--dist', 'dist'));
const allowPath = opt('--allow', 'scripts/seo/allowed-changes.json');
const rulesPath = opt('--rules', 'scripts/seo/rules.json');
if (!baselinePath) {
  console.error('usage: node scripts/seo/check.mjs --baseline <baseline.json> --dist dist [--allow f] [--rules f] [--out f] [--report f] [--strict-unused]');
  process.exit(2);
}

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const allow = JSON.parse(await readFile(allowPath, 'utf8'));
// "${releaseDate}" (YYYY-MM-DD) and "${releaseMonthYear}" (for example "November
// 2026") in allowlist entries stand for allow.releaseDate, which the implementer
// sets once, in work package 13. Until it is set, such entries cannot match.
if (allow.releaseDate) {
  const d = new Date(`${allow.releaseDate}T12:00:00Z`);
  const monthYear = d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fill = (v) => (typeof v === 'string' ? v.replaceAll('${releaseDate}', allow.releaseDate).replaceAll('${releaseMonthYear}', monthYear)
    : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v);
  allow.entries = (allow.entries || []).map(fill);
}
// --skip-wp WPnn drops the entries of one work package, for a build that leaves
// it out (work package 12 waits for the owner's legal facts).
// Several packages are given with commas (--skip-wp WP12,WP14).
if (opt('--skip-wp')) { const skip = opt('--skip-wp').split(','); allow.entries = (allow.entries || []).filter((e) => !skip.includes(e.wp)); }
// "${en:<key>}" in allowlist entries stands for that key's value in
// src/i18n/locales/en.json, for text the owner fills in later (the operator
// details in the footer). A key that does not exist is left as written.
{
  let en = {};
  try { en = JSON.parse(await readFile(resolve('src/i18n/locales/en.json'), 'utf8')); } catch { /* no en.json */ }
  const fillEn = (v) => (typeof v === 'string' ? v.replace(/\$\{en:([^}]+)\}/g, (m, k) => (Object.hasOwn(en, k) ? en[k] : m))
    : Array.isArray(v) ? v.map(fillEn) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillEn(x)])) : v);
  allow.entries = (allow.entries || []).map(fillEn);
}
const rules = JSON.parse(await readFile(rulesPath, 'utf8'));
const cand = await snapshot(distDir);
for (const route of Object.keys(cand.routes)) cand.routes[route].assets = await measureRoute(distDir, route);
if (opt('--out')) await writeFile(resolve(opt('--out')), JSON.stringify(cand, null, 2) + '\n');

const FROZEN = new Set(['route-added', 'title', 'meta', 'head-link', 'jsonld', 'h1-added', 'h1-removed', 'lang', 'robots', 'sitemap-loc-added', 'sitemap-loc-removed']);
const PRE = new Set(['jsonld-dateModified', 'sitemap-lastmod']);
const entries = (allow.entries || []).map((e) => ({ ...e, used: 0 }));
const failures = [];
const allowed = [];
const notes = [];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const stripDates = (v) => JSON.parse(JSON.stringify(v, (k, x) => (k === 'dateModified' ? undefined : x)));

function statusOk(type, status) {
  if (FROZEN.has(type)) return status === 'approved';
  if (PRE.has(type)) return status === 'approved' || status === 'pre-approved';
  return status === 'spec' || status === 'approved';
}

/** Record one difference; it passes only if an allowlist entry matches it with a valid status. */
function diff(item) {
  const match = entries.find((e) => (e.route === item.route || e.route === '*') && e.type === item.type && matches(e, item));
  if (match && statusOk(item.type, match.status)) {
    match.used += 1;
    allowed.push({ ...item, entry: match.id });
  } else {
    failures.push({ ...item, reason: match ? `entry ${match.id} has status "${match.status}", which does not allow a ${item.type} change` : 'not in the allowlist' });
  }
}

function matches(e, item) {
  switch (item.type) {
    case 'text-added':
    case 'text-removed':
      return e.text === item.text;
    case 'link-added':
    case 'link-removed':
      return e.href === item.href && (e.text === undefined || e.text === item.text);
    case 'heading-added':
    case 'heading-removed':
    case 'h1-added':
    case 'h1-removed':
      return e.level === item.level && e.text === item.text;
    case 'image-added':
    case 'image-removed':
      return e.src === item.src && (e.alt === undefined || e.alt === item.alt);
    case 'meta':
      return e.key === item.key && same(e.after ?? null, item.after ?? null);
    case 'head-link':
      return e.rel === item.rel && same(e.after ?? null, item.after ?? null);
    case 'jsonld':
    case 'jsonld-dateModified':
      // jsonldId names the JSON-LD block ("jsonld-main"); id names the entry.
      return e.jsonldId === item.id && same(e.after, item.after);
    case 'sitemap-loc-added':
    case 'sitemap-loc-removed':
      return e.loc === item.loc;
    case 'sitemap-lastmod':
      return e.loc === item.loc && e.after === item.after;
    case 'route-added':
      return true;
    default:
      return same(e.after ?? null, item.after ?? null);
  }
}

function multiset(a, b, key) {
  const left = new Map();
  for (const x of b) left.set(key(x), (left.get(key(x)) || 0) + 1);
  const removed = [];
  for (const x of a) {
    const k = key(x);
    if (left.get(k) > 0) left.set(k, left.get(k) - 1);
    else removed.push(x);
  }
  const right = new Map();
  for (const x of a) right.set(key(x), (right.get(key(x)) || 0) + 1);
  const added = [];
  for (const x of b) {
    const k = key(x);
    if (right.get(k) > 0) right.set(k, right.get(k) - 1);
    else added.push(x);
  }
  return { removed, added };
}

const textOf = (p) => p.chunks.join('\n');
const metaKeys = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].sort();

// 1 to 3: route by route comparison.
for (const route of Object.keys(baseline.routes)) {
  if (!cand.routes[route]) failures.push({ route, type: 'route-removed', reason: 'a prerendered route disappeared (rule 1)' });
}
for (const route of Object.keys(cand.routes)) {
  const b = baseline.routes[route];
  const c = cand.routes[route];
  if (!b) {
    diff({ route, type: 'route-added' });
    continue;
  }
  if (b.lang !== c.lang) diff({ route, type: 'lang', before: b.lang, after: c.lang });
  if (b.title !== c.title) diff({ route, type: 'title', before: b.title, after: c.title });
  for (const key of metaKeys(b.meta, c.meta)) {
    if ((b.meta[key] ?? null) !== (c.meta[key] ?? null)) diff({ route, type: 'meta', key, before: b.meta[key] ?? null, after: c.meta[key] ?? null });
  }
  for (const rel of [...new Set([...b.headLinks, ...c.headLinks].map((l) => l.rel))]) {
    const bl = b.headLinks.filter((l) => l.rel === rel);
    const cl = c.headLinks.filter((l) => l.rel === rel);
    if (!same(bl, cl)) diff({ route, type: 'head-link', rel, before: bl, after: cl });
  }
  const ids = [...new Set([...b.jsonld, ...c.jsonld].map((j) => j.id))];
  for (const id of ids) {
    const bj = b.jsonld.find((j) => j.id === id);
    const cj = c.jsonld.find((j) => j.id === id);
    if (same(bj, cj)) continue;
    if (bj && cj && same(stripDates(bj), stripDates(cj))) {
      const dates = [];
      JSON.stringify(cj.data, (k, x) => (k === 'dateModified' && dates.push(x), x));
      diff({ route, type: 'jsonld-dateModified', id, after: dates });
    } else {
      diff({ route, type: 'jsonld', id, before: bj ? bj.data : null, after: cj ? cj.data : null });
    }
  }
  const h1b = b.headings.filter((h) => h.level === 1);
  const h1c = c.headings.filter((h) => h.level === 1);
  const h1d = multiset(h1b, h1c, (h) => h.text);
  h1d.removed.forEach((h) => diff({ route, type: 'h1-removed', level: 1, text: h.text }));
  h1d.added.forEach((h) => diff({ route, type: 'h1-added', level: 1, text: h.text }));
  const hd = multiset(b.headings.filter((h) => h.level > 1), c.headings.filter((h) => h.level > 1), (h) => `${h.level}|${h.text}`);
  hd.removed.forEach((h) => diff({ route, type: 'heading-removed', level: h.level, text: h.text }));
  hd.added.forEach((h) => diff({ route, type: 'heading-added', level: h.level, text: h.text }));
  const td = multiset(b.chunks, c.chunks, (t) => t);
  td.removed.forEach((text) => diff({ route, type: 'text-removed', text }));
  td.added.forEach((text) => diff({ route, type: 'text-added', text }));
  const ld = multiset(b.links, c.links, (l) => `${l.href}|${l.text}`);
  ld.removed.forEach((l) => diff({ route, type: 'link-removed', href: l.href, text: l.text }));
  ld.added.forEach((l) => diff({ route, type: 'link-added', href: l.href, text: l.text }));
  const id = multiset(b.images, c.images, (i) => `${i.src}|${i.alt}`);
  id.removed.forEach((i) => diff({ route, type: 'image-removed', src: i.src, alt: i.alt }));
  id.added.forEach((i) => diff({ route, type: 'image-added', src: i.src, alt: i.alt }));
}

// Site files.
if ((baseline.site.robots ?? null) !== (cand.site.robots ?? null)) diff({ route: '(site)', type: 'robots', before: baseline.site.robots, after: cand.site.robots });
const bLocs = new Map((baseline.site.sitemap || []).map((u) => [u.loc, u]));
const cLocs = new Map((cand.site.sitemap || []).map((u) => [u.loc, u]));
for (const [loc] of bLocs) if (!cLocs.has(loc)) diff({ route: '(site)', type: 'sitemap-loc-removed', loc });
for (const [loc, u] of cLocs) {
  if (!bLocs.has(loc)) diff({ route: '(site)', type: 'sitemap-loc-added', loc });
  else if (bLocs.get(loc).lastmod !== u.lastmod) diff({ route: '(site)', type: 'sitemap-lastmod', loc, before: bLocs.get(loc).lastmod, after: u.lastmod });
}
if ((baseline.site.llms ?? null) !== (cand.site.llms ?? null)) diff({ route: '(site)', type: 'llms', before: baseline.site.llms, after: cand.site.llms });

// 4: key phrases and lead facts.
for (const [route, phrases] of Object.entries(rules.keyPhrases || {})) {
  const b = baseline.routes[route];
  const c = cand.routes[route];
  if (!b || !c) continue;
  for (const phrase of phrases) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(textOf(b)) && !re.test(textOf(c))) failures.push({ route, type: 'key-phrase', text: phrase, reason: 'key phrase no longer in the static text (rule 4)' });
  }
}
for (const [route, facts] of Object.entries(rules.leadFacts || {})) {
  const b = baseline.routes[route];
  const c = cand.routes[route];
  if (!b || !c) continue;
  for (const f of facts) {
    const re = new RegExp(f.pattern, 'i');
    if (re.test(b.lead) && !re.test(c.lead)) failures.push({ route, type: 'lead-fact', text: f.fact, reason: 'fact missing from h1 plus the first 150 words (rule 4)' });
    if (!re.test(b.lead)) notes.push(`${route}: lead fact "${f.fact}" was not in the baseline lead either`);
  }
}

// 5: FAQ JSON-LD against visible text.
function faqMismatches(p) {
  const out = [];
  const text = textOf(p).replace(/\s+/g, ' ');
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const type = [].concat(node['@type'] || []);
    if (type.includes('Question')) {
      const q = (node.name || '').replace(/\s+/g, ' ').trim();
      const a = ((node.acceptedAnswer || {}).text || '').replace(/\s+/g, ' ').trim();
      if (q && !text.includes(q)) out.push(`question not visible: ${q}`);
      if (a && !text.includes(a)) out.push(`answer not visible: ${a}`);
    }
    Object.values(node).forEach(visit);
  };
  p.jsonld.forEach((j) => visit(j.data));
  return out;
}
for (const [route, c] of Object.entries(cand.routes)) {
  const before = new Set(baseline.routes[route] ? faqMismatches(baseline.routes[route]) : []);
  for (const m of faqMismatches(c)) {
    if (before.has(m)) notes.push(`${route}: baseline already has this FAQ mismatch: ${m}`);
    else failures.push({ route, type: 'faq-jsonld', text: m, reason: 'FAQ JSON-LD must match the visible FAQ (rule 5)' });
  }
}

// 6: internal links.
const ORIGIN = 'https://veidne.com';
const routesNow = new Set(Object.keys(cand.routes));
const routesBase = new Set(Object.keys(baseline.routes));
const pathOf = (href) => {
  if (!href) return null;
  if (href.startsWith(ORIGIN)) href = href.slice(ORIGIN.length) || '/';
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  return href;
};
const legacy = new Set();
for (const p of Object.values(baseline.routes)) {
  for (const l of p.links) {
    const h = pathOf(l.href);
    if (h) {
      const path = h.split(/[?#]/)[0] || '/';
      if (!routesBase.has(path)) legacy.add(path);
    }
  }
}
const exists = async (p) => access(join(distDir, p)).then(() => true, () => false);
for (const [route, c] of Object.entries(cand.routes)) {
  for (const l of c.links) {
    if (l.href && l.href.startsWith('#')) {
      const frag = decodeURIComponent(l.href.slice(1));
      if (frag && !c.ids.includes(frag)) failures.push({ route, type: 'fragment', href: l.href, reason: 'same-page fragment has no target id (rule 6)' });
      continue;
    }
    const h = pathOf(l.href);
    if (!h) continue;
    const [pathPart, fragPart] = [h.split(/[?#]/)[0] || '/', h.includes('#') ? decodeURIComponent(h.split('#')[1]) : null];
    const ok = routesNow.has(pathPart) || (rules.spaLinkTargets || []).includes(pathPart) || legacy.has(pathPart) || (/\.[a-z0-9]+$/i.test(pathPart) && (await exists(pathPart)));
    if (!ok) failures.push({ route, type: 'link-target', href: l.href, reason: 'internal link to a path that is not prerendered (soft 404, rule 6)' });
    if (fragPart && routesNow.has(pathPart) && !cand.routes[pathPart].ids.includes(fragPart)) {
      failures.push({ route, type: 'fragment', href: l.href, reason: `no element with id "${fragPart}" in the static HTML of ${pathPart} (rule 6)` });
    }
  }
}

// 7: noindex sources.
for (const n of rules.noindexSources || []) {
  try {
    const src = await readFile(resolve(n.file), 'utf8');
    if (!new RegExp(n.pattern, 's').test(src)) failures.push({ route: n.route, type: 'noindex', text: n.file, reason: 'PageSeo noindex no longer found (rule 7)' });
  } catch {
    failures.push({ route: n.route, type: 'noindex', text: n.file, reason: 'file not found (rule 7)' });
  }
}

// 8: performance budget.
for (const [route, budget] of Object.entries(rules.budget || {})) {
  const b = baseline.routes[route] && baseline.routes[route].assets;
  const c = cand.routes[route] && cand.routes[route].assets;
  if (!b || !c) continue;
  for (const kind of ['js', 'css']) {
    // A percentage tolerance (ignored by --budget-strict) and a fixed byte
    // allowance (part of the budget itself; used for the tiny stylesheet).
    const tolerance = flag('--budget-strict') ? 0 : budget[`${kind}GzipTolerancePct`] || 0;
    const allowance = budget[`${kind}GzipAllowanceBytes`] || 0;
    const limit = Math.max(Math.round(b[kind].gzip * (1 + tolerance / 100)), b[kind].gzip + allowance);
    const line = `${route} ${kind} gzip ${c[kind].gzip} bytes (baseline ${b[kind].gzip}, limit ${limit})`;
    if (c[kind].gzip > limit) failures.push({ route, type: 'budget', text: line, reason: 'page loads more than the budget (rule 8)' });
    else notes.push(line);
  }
}
// 8, second part: libraries that must stay off public pages (empty until work package 7).
for (const [route, c] of Object.entries(cand.routes)) {
  for (const a of (c.assets && c.assets.assets) || []) {
    const hit = (rules.forbiddenAssets || []).find((f) => a.path.includes(f));
    if (hit) failures.push({ route, type: 'editor-libs', text: a.path, reason: `a public page loads ${hit}* (rule 8)` });
  }
}

// 9: structure.
for (const [route, c] of Object.entries(cand.routes)) {
  const n = c.headings.filter((h) => h.level === 1).length;
  if (n !== 1) failures.push({ route, type: 'h1-count', text: String(n), reason: 'a page needs exactly one h1' });
  for (const j of c.jsonld) if (j.error) failures.push({ route, type: 'jsonld-parse', text: j.error, reason: 'JSON-LD does not parse' });
}

// Entries marked "transient" describe an intermediate state (a later work
// package changes the same text again), so they may stay unused at the end.
const unused = entries.filter((e) => e.used === 0);
// Entries with status "pending" or "rejected" describe changes that must not be
// built, so they are expected to stay unused as well.
const expected = (e) => !e.transient && ['spec', 'approved', 'pre-approved'].includes(e.status);
if (flag('--strict-unused')) unused.filter(expected).forEach((e) => failures.push({ route: e.route, type: 'unused-entry', text: e.id, reason: 'allowlist entry matched nothing; the spec expects this change' }));

const short = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s && s.length > 160 ? s.slice(0, 157) + '...' : s;
};
console.log(`SEO check: ${Object.keys(cand.routes).length} routes, ${allowed.length} allowed changes, ${failures.length} failures, ${unused.length} unused allowlist entries`);
for (const f of failures) console.log(`FAIL  ${f.route}  ${f.type}  ${short(f.text ?? f.after ?? f.href ?? f.key ?? f.id ?? '')}  (${f.reason})`);
for (const a of allowed) console.log(`ok    ${a.route}  ${a.type}  ${short(a.text ?? a.after ?? a.href ?? a.key ?? a.id ?? '')}  [${a.entry}]`);
for (const n of notes) console.log(`note  ${n}`);
if (!flag('--strict-unused')) for (const e of unused) console.log(`info  unused entry ${e.id} (${e.type} ${e.route})`);
if (opt('--report')) await writeFile(resolve(opt('--report')), JSON.stringify({ failures, allowed, notes, unused: unused.map((e) => e.id) }, null, 2) + '\n');
process.exit(failures.length ? 1 : 0);
