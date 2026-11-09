import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

// What the merge-import analysis finds in each fixture, run in a real browser
// (the detector uses the browser's DOMParser), and proof that the templates
// Veidne already ships, and the older e2e fixtures, never open the import
// step: their {{Name}} fields are Veidne's own and nothing else in them
// reads as a placeholder.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'fixtures', 'merge-import');
const LIBRARY = path.join(HERE, '..', 'public', 'templates');
const OLD_FIXTURES = path.join(HERE, 'fixtures');

interface Summary {
  auto: string[];
  candidates: string[];
  controls: string[];
  wholeBodyLoop: string | null;
}

async function analyze(page: Page, file: string): Promise<Summary> {
  const b64 = fs.readFileSync(file).toString('base64');
  return page.evaluate(async (b64) => {
    const { analyzeTemplate } = await import('/src/features/editor/utils/mergeImport.ts');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const a = analyzeTemplate(bytes.buffer);
    return {
      auto: a.autoNames,
      candidates: a.candidates.map((c) => `${c.family}:${c.name} x${c.occurrences} ${c.parts.join('+')}${c.formats.length ? ` [${c.formats.join(',')}]` : ''}${c.preselected ? '' : ' (unticked)'}`),
      controls: a.controls.map((c) => `${c.family}:${c.tag}@${c.part.replace('word/', '')}${c.references?.length ? ` uses ${c.references.join(',')}` : ''}`),
      wholeBodyLoop: a.wholeBodyLoop ? `${a.wholeBodyLoop.open} .. ${a.wholeBodyLoop.close}` : null,
    };
  }, b64);
}

const EXPECTED: Record<string, Summary> = {
  'word-mergefield': {
    auto: [],
    candidates: [
      'mergefield:First_Name x2 body', 'mergefield:Last Name x1 body', 'mergefield:Start_Date x1 body [date]',
      'mergefield:Fee x1 body [number]', 'mergefield:Title x1 body', 'mergefield:City x1 body',
    ],
    controls: [], wholeBodyLoop: null,
  },
  'word-mergefield-header': {
    auto: [],
    candidates: ['mergefield:Company x1 header', 'doubleBrace:Department x1 header', 'mergefield:Reference_No x1 footer'],
    controls: [], wholeBodyLoop: null,
  },
  'chevron': { auto: [], candidates: ['chevron:Name x2 body', 'chevron:Address x1 body', 'chevron:Date x1 body'], controls: [], wholeBodyLoop: null },
  'double-brace': { auto: ['Invoice_No', 'Due Date'], candidates: ['doubleBrace:Customer x2 body+header'], controls: [], wholeBodyLoop: null },
  'single-brace': {
    auto: [],
    candidates: ['singleBrace:Name x1 body (unticked)', 'singleBrace:Order_No x1 body (unticked)', 'singleBrace:City x1 body (unticked)'],
    controls: [], wholeBodyLoop: null,
  },
  'percent': {
    auto: [],
    candidates: ['percent:Name x1 body (unticked)', 'percent:Order_No x1 body (unticked)', 'percent:City x1 body (unticked)'],
    controls: [], wholeBodyLoop: null,
  },
  'guillemet-dollar': { auto: [], candidates: ['guillemet:Name x1 body', 'dollarBrace:Code x1 body'], controls: [], wholeBodyLoop: null },
  'handlebars-each': {
    auto: ['Customer'], candidates: [],
    controls: ['handlebars:#each rows@document.xml uses name,amount', 'handlebars:/each@document.xml', 'handlebars:#if vip@document.xml', 'handlebars:/if@document.xml'],
    wholeBodyLoop: null,
  },
  'handlebars-each-whole': {
    auto: [], candidates: [],
    controls: ['handlebars:#each rows@document.xml uses Name,Balance', 'handlebars:/each@document.xml'],
    wholeBodyLoop: '{{#each rows}} .. {{/each}}',
  },
  'handlebars-each-header': {
    auto: ['Customer'], candidates: [],
    controls: ['handlebars:#each rows@header1.xml uses name', 'handlebars:/each@header1.xml'],
    wholeBodyLoop: null,
  },
  'docxtemplater-loop': {
    auto: [], candidates: ['singleBrace:Customer x1 body (unticked)'],
    controls: ['docxtemplater:#items@document.xml uses product,qty', 'docxtemplater:/items@document.xml'],
    wholeBodyLoop: null,
  },
  'jinja-for': {
    auto: [], candidates: ['doubleBrace:Customer x1 body'],
    controls: ['jinja:for line in lines@document.xml uses line.text', 'jinja:endfor@document.xml', 'jinja:if paid@document.xml', 'jinja:endif@document.xml'],
    wholeBodyLoop: null,
  },
  'word-control-fields': {
    auto: [], candidates: ['mergefield:Surname x1 body'],
    controls: [
      'wordField:IF@document.xml uses Gender', 'wordField:MERGEREC@document.xml', 'wordField:MERGESEQ@document.xml',
      'wordField:NEXT@document.xml', 'wordField:NEXTIF@document.xml uses Region', 'wordField:SKIPIF@document.xml uses Active',
    ],
    wholeBodyLoop: null,
  },
  'plain': { auto: [], candidates: [], controls: [], wholeBodyLoop: null },
  'prose-braces-percent': {
    auto: [], candidates: ['percent:PATH x1 body (unticked)', 'percent:APPDATA x1 body (unticked)'], controls: [], wholeBodyLoop: null,
  },
};

test('every merge-import fixture is analysed as expected', async ({ page }) => {
  await page.goto('/');
  const fixtures = fs.readdirSync(DIR).filter((f) => f.endsWith('.docx')).map((f) => f.replace(/\.docx$/, '')).sort();
  expect(fixtures).toEqual(Object.keys(EXPECTED).sort());
  for (const f of fixtures) {
    expect(await analyze(page, path.join(DIR, `${f}.docx`)), f).toEqual(EXPECTED[f]);
  }
});

test('library templates and older fixtures never open the import step', async ({ page }) => {
  await page.goto('/');
  const files = [
    ...fs.readdirSync(LIBRARY).filter((f) => f.endsWith('.docx')).map((f) => path.join(LIBRARY, f)),
    ...fs.readdirSync(OLD_FIXTURES).filter((f) => f.endsWith('.docx')).map((f) => path.join(OLD_FIXTURES, f)),
  ];
  expect(files.length).toBeGreaterThan(20);
  for (const file of files) {
    const a = await analyze(page, file);
    expect({ file: path.basename(file), candidates: a.candidates, controls: a.controls })
      .toEqual({ file: path.basename(file), candidates: [], controls: [] });
  }
});
