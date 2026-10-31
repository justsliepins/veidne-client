// Generates e2e/fixtures/veidne-locale-formats.xlsx, the fixture for the
// regional date and number styles (audit nov 2026, finding 2).
//
//   node e2e/fixtures/make-locale-formats-fixture.mjs
//
// The cells reference Excel's built-in number formats the way Excel itself
// writes them: a date typed into Excel gets numFmtId="14" on its cell style
// and no <numFmt> element (the code is implied, ECMA-376 Part 1, 18.8.30),
// and custom codes get ids from 164 up. SheetJS writes the built-in ids
// itself; this script then post-processes xl/styles.xml for three things
// SheetJS cannot express: a custom code that reads exactly "m/d/yy" but is
// not format 14, format 44 with its code written out (as Excel writes the
// accounting formats), and Excel-style ids (164 up) for the custom codes.
// The output is byte-for-byte reproducible (fixed zip dates, no folder
// entries), in any time zone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Default import: Node loads the CommonJS build, whose named exports omit SSF.
import XLSX from 'xlsx';
import JSZip from 'jszip';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'veidne-locale-formats.xlsx');

// Excel serials (1900 date system): 46340 = 14 Nov 2026, 46086 = 5 Mar 2026,
// 46022 = 31 Dec 2025.
const D1 = 46340, D2 = 46086, D3 = 46022;
const T = (h, m) => (h * 60 + m) / 1440;

// Placeholder codes SheetJS stores as custom formats, replaced below.
const MDY_PLACEHOLDER = '0.0000001';
const ACC44_PLACEHOLDER = '0.0000002';
// Format 44 as a Latvian Excel writes it (accounting, euro after the number).
const ACC44_CODE = '_-* #,##0.00\\ "€"_-;\\-* #,##0.00\\ "€"_-;_-* "-"??\\ "€"_-;_-@_-';

// [header, [row 1, row 2, row 3], number format]. A number format of null
// leaves the cell General; strings are text cells. The first seven columns
// carry the field names of veidne-format-test-template.docx, so the browser
// test reuses that template; the rest only exist for the parse-level test.
const COLUMNS = [
  ['NAME', ['Anna Ozola', 'Jānis Bērziņš', 'Līga Žagata'], null],
  ['TRUEDATE', [D1, D2, D3], XLSX.SSF._table[14]],                  // built-in 14 (a typed date)
  ['ZIP', [2451, 70, 905], '00000'],                               // leading zeros
  ['AMOUNT', [1234.5, 945.5, 1234567.891], XLSX.SSF._table[4]],    // built-in 4 #,##0.00
  ['PERCENT', [0.125, 0.3, 1], XLSX.SSF._table[10]],               // built-in 10 0.00%
  ['EURO', [1500, 99.9, 2500.55], '#,##0.00 "€"'],                 // custom
  ['TEXTDATE', ['February 22, 2025', 'March 5, 2025', 'December 31, 2025'], null], // text
  ['DATETIME', [D1 + T(9, 30), D2 + T(17, 5), D3], XLSX.SSF._table[22]], // built-in 22
  ['CUSTOMDOT', [D1, D2, D3], 'dd.mm.yyyy'],                       // custom, explicit
  ['CUSTOMMDY', [D1, D2, D3], MDY_PLACEHOLDER],                    // custom "m/d/yy", not 14
  ['LONGDATE', [D1, D2, D3], '[$-F800]dddd\\,\\ mmmm\\ dd\\,\\ yyyy'], // system long date
  ['TIME', [D1 + T(9, 30), D2 + T(17, 5), D3], XLSX.SSF._table[20]],    // built-in 20 h:mm
  ['INTEGER', [1234.5, 7, 1000000], XLSX.SSF._table[3]],           // built-in 3 #,##0
  ['DECIMAL', [1234.5, 0.5, 12], XLSX.SSF._table[2]],              // built-in 2 0.00
  ['GENERAL', [1234.5, 0.75, 2026], null],                         // General
  ['EURLOC', [1500, 99.9, 2500.55], '[$€-426] #,##0.00'],          // custom, Latvian tag
  ['ACC44', [1234.5, 0, -50], ACC44_PLACEHOLDER],                  // built-in 44, code written out
  ['NEGATIVE', [-1234.5, 3.25, 0], '#,##0.00;[Red]-#,##0.00'],     // custom, two sections
  ['TEXTNUM', ['1,234.50', '02.03.2026', '1 234,50'], null],       // typed as text
  [D1, ['x', 'y', 'z'], XLSX.SSF._table[14]],                      // header cell is a date
];

const header = COLUMNS.map(([h]) => h);
const body = [0, 1, 2].map((i) => COLUMNS.map(([, values]) => values[i]));
const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
COLUMNS.forEach(([, , fmt], c) => {
  if (!fmt) return;
  // The date header cell takes format 14 too; every data cell takes its column's format.
  for (let r = c === COLUMNS.length - 1 ? 0 : 1; r <= 3; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell && cell.t === 'n') cell.z = fmt;
  }
});
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Data');
const written = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: true });

const zip = await JSZip.loadAsync(written);
let styles = await zip.file('xl/styles.xml').async('string');

// Custom codes as SheetJS wrote them, in id order.
const numFmts = [...styles.matchAll(/<numFmt numFmtId="(\d+)" formatCode="([^"]*)"\/>/g)]
  .map((m) => ({ id: Number(m[1]), code: m[2] }));
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// SheetJS writes no element for the built-in ids it references (14, 22, 2,
// 3, 4, 10, 20 here), always writes id 56 (a built-in Chinese time code that
// Excel never writes) and numbers custom codes below 164. Drop 56, give the
// custom codes Excel's ids (164 up) and resolve the two placeholders.
let nextId = 164;
const idMap = new Map();
const kept = [];
for (const { id, code } of numFmts) {
  const text = unescape(code);
  if (id === 56) continue;
  if (text === ACC44_PLACEHOLDER) { idMap.set(id, 44); kept.push({ id: 44, code: ACC44_CODE }); continue; }
  const newId = nextId++;
  idMap.set(id, newId);
  kept.push({ id: newId, code: text === MDY_PLACEHOLDER ? 'm/d/yy' : text });
}
// Rewrite the cell styles' numFmtId references, then the <numFmts> block.
styles = styles.replace(/<xf numFmtId="(\d+)"/g, (all, id) => {
  const mapped = idMap.get(Number(id));
  return mapped == null ? all : `<xf numFmtId="${mapped}"`;
});
const block = `<numFmts count="${kept.length}">${kept
  .sort((a, b) => a.id - b.id)
  .map(({ id, code }) => `<numFmt numFmtId="${id}" formatCode="${escape(code)}"/>`)
  .join('')}</numFmts>`;
styles = styles.replace(/<numFmts[^>]*>[\s\S]*?<\/numFmts>/, block);

// Fixed dates so the file is reproducible.
const out = new JSZip();
const FIXED = new Date(Date.UTC(2026, 9, 31, 12, 0, 0));
for (const name of Object.keys(zip.files).sort()) {
  const entry = zip.files[name];
  if (entry.dir) continue;
  const data = name === 'xl/styles.xml' ? styles : await entry.async('uint8array');
  out.file(name, data, { date: FIXED, createFolders: false });
}
const bytes = await out.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', platform: 'UNIX' });
fs.writeFileSync(OUT, bytes);
console.log(`wrote ${path.relative(process.cwd(), OUT)} (${bytes.length} bytes)`);
console.log(block);
