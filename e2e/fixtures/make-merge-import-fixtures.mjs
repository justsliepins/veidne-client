// Generates the merge-template import fixtures in e2e/fixtures/merge-import/.
//
//   node e2e/fixtures/make-merge-import-fixtures.mjs
//
// One .docx per placeholder family Veidne recognises, one per control
// structure it refuses, and two negatives (a plain letter, and prose full of
// braces and percent signs). The Word fixtures are written the way Word
// writes a mail merge document: MERGEFIELD codes as fldChar begin /
// instrText / separate / «Name» / end, the instruction split over several
// runs (Word splits it wherever an rsid, a proofing mark or an edit lands,
// even inside the keyword), and the \* MERGEFORMAT switch Word adds to every
// field it inserts. Typed placeholders are split across runs too, with
// proofErr marks between them, because that is what a real document holds
// after spell check has touched it.
//
// Every fixture also has a matching .xlsx whose header row holds the field
// names, so the import can be driven end to end. Output is reproducible:
// fixed zip dates, no folder entries.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import XLSX from 'xlsx';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'merge-import');
const DATE = new Date('2026-11-09T00:00:00Z');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CT_MAIN = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
const CT_HDR = 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml';
const CT_FTR = 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Run builders ────────────────────────────────────────────────────────────

let rsid = 0x00a10000;
const nextRsid = () => (rsid++).toString(16).toUpperCase().padStart(8, '0');

/** A plain text run. */
const t = (text, rPr = '') => `<w:r w:rsidR="${nextRsid()}">${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
/** The proofing mark spell check leaves between runs. */
const proof = (type) => `<w:proofErr w:type="${type}"/>`;
/** A paragraph of runs. */
const p = (...runs) => `<w:p w:rsidR="${nextRsid()}" w:rsidRDefault="${nextRsid()}">${runs.join('')}</w:p>`;

/**
 * A complex field exactly as Word writes it: begin, the instruction split
 * into the given pieces (one run each), separate, the display text, end.
 * `nested` pieces may be other complex fields (for IF { MERGEFIELD x }).
 */
function complexField(instrPieces, display) {
  const instr = instrPieces.map((piece) => (piece.startsWith('<w:r')
    ? piece
    : `<w:r w:rsidR="${nextRsid()}"><w:instrText xml:space="preserve">${esc(piece)}</w:instrText></w:r>`)).join('');
  return `<w:r><w:fldChar w:fldCharType="begin"/></w:r>${instr}`
    + `<w:r><w:fldChar w:fldCharType="separate"/></w:r>`
    + `<w:r><w:rPr><w:noProof/></w:rPr><w:t xml:space="preserve">${esc(display)}</w:t></w:r>`
    + `<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
}

/** A MERGEFIELD the way Word inserts one: split keyword, MERGEFORMAT switch. */
const wordMergeField = (name, pieces) => complexField(
  pieces ?? [' MERGEFIE', `LD ${name.includes(' ') ? `"${name}"` : name} `, '\\* MERGEFORMAT '],
  `«${name}»`,
);

/** The simple field form, w:fldSimple, which Word writes for short fields. */
const simpleField = (instr, display) => `<w:fldSimple w:instr="${esc(instr)}"><w:r><w:rPr><w:noProof/></w:rPr><w:t>${esc(display)}</w:t></w:r></w:fldSimple>`;

// ── Package builder ─────────────────────────────────────────────────────────

const sectPr = (refs = '') => `<w:sectPr>${refs}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;

/**
 * @param {object} spec
 * @param {string[]} spec.body paragraphs (already built)
 * @param {Record<string,string[]>} [spec.headers] part name → paragraphs
 * @param {Record<string,string[]>} [spec.footers] part name → paragraphs
 * @param {string} [spec.sectionBreakAfter] index into body after which a
 *   second section starts; headers listed in spec.section2 belong to it.
 */
async function makeDocx(file, spec) {
  const zip = new JSZip();
  const headers = spec.headers ?? {};
  const footers = spec.footers ?? {};
  const overrides = [`<Override PartName="/word/document.xml" ContentType="${CT_MAIN}"/>`];
  const rels = [];
  const refsBySection = [[], []];
  let rid = 10;

  const addPart = (name, paras, kind) => {
    const id = `rId${rid++}`;
    const tag = kind === 'header' ? 'hdr' : 'ftr';
    zip.file(`word/${name}`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:${tag} xmlns:w="${W_NS}" xmlns:r="${R_NS}">${paras.join('')}</w:${tag}>`, { date: DATE });
    overrides.push(`<Override PartName="/word/${name}" ContentType="${kind === 'header' ? CT_HDR : CT_FTR}"/>`);
    rels.push(`<Relationship Id="${id}" Type="${REL}/${kind}" Target="${name}"/>`);
    const section = (spec.section2 ?? []).includes(name) ? 1 : 0;
    refsBySection[section].push(`<w:${kind}Reference w:type="default" r:id="${id}"/>`);
  };
  for (const [name, paras] of Object.entries(headers)) addPart(name, paras, 'header');
  for (const [name, paras] of Object.entries(footers)) addPart(name, paras, 'footer');

  let body = spec.body.join('');
  if (spec.sectionBreakAfter !== undefined) {
    const first = spec.body.slice(0, spec.sectionBreakAfter + 1);
    const rest = spec.body.slice(spec.sectionBreakAfter + 1);
    // The first section's properties ride on its last paragraph.
    const last = first.pop().replace(/^(<w:p [^>]*>)/, `$1<w:pPr>${sectPr(refsBySection[0].join(''))}</w:pPr>`);
    body = [...first, last, ...rest].join('') + sectPr(refsBySection[1].join(''));
  } else {
    body += sectPr(refsBySection[0].join(''));
  }

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides.join('')}</Types>`, { date: DATE });
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`, { date: DATE });
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`, { date: DATE });
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}</w:body></w:document>`, { date: DATE });

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(path.join(DIR, file), buf);
}

/** A spreadsheet with the given header row and two data rows. */
function makeXlsx(file, header, rows) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  // SheetJS stamps the workbook with the current time; pin it.
  wb.Props = { CreatedDate: DATE, ModifiedDate: DATE };
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
  fs.writeFileSync(path.join(DIR, file), buf);
}

// ── Fixtures ────────────────────────────────────────────────────────────────

fs.mkdirSync(DIR, { recursive: true });

// 1. Word MERGEFIELD letter, written the way Word writes it.
await makeDocx('word-mergefield.docx', {
  body: [
    p(t('Dear '), wordMergeField('First_Name'), t(' '), wordMergeField('Last Name', [' MERGEFIELD  "Last Name" ', '\\* Upper ', '\\* MERGEFORMAT '])),
    p(t('Your contract starts on '),
      wordMergeField('Start_Date', [' MERGEFIELD Start_Date ', '\\@ "d MMMM yyyy" ', '\\* MERGEFORMAT ']),
      t(' at a monthly fee of '),
      wordMergeField('Fee', [' MERGEFIELD Fee \\# "#,##0.00" ', '\\* MERGEFORMAT ']),
      t(' EUR.')),
    p(complexField([' MERGEFIELD Title \\b "Dear " \\f ", " ', '\\* FirstCap ', '\\* MERGEFORMAT '], '«Title»'),
      t('we look forward to working with you, '), wordMergeField('First_Name', [' MERGEFIELD ', 'First_Name', ' \\* Caps \\* MERGEFORMAT ']), t('.')),
    p(t('Delivery to '), simpleField(' MERGEFIELD City \\* Lower \\* MERGEFORMAT ', '«City»'), t('.')),
  ],
});
makeXlsx('word-mergefield.xlsx', ['First_Name', 'Last Name', 'Start_Date', 'Fee', 'Title', 'City'],
  [['Anna', 'Ozola', '1 December 2026', '1,250.00', 'Ms', 'Riga'], ['Janis', 'Berzins', '5 January 2027', '980.50', 'Mr', 'Cesis']]);

// 2. MERGEFIELDs in a header and a footer, and a {{ }} field in the header of
//    a second section (header4.xml, past the header1-3 the old code read).
await makeDocx('word-mergefield-header.docx', {
  headers: {
    'header1.xml': [p(t('Prepared for '), wordMergeField('Company'))],
    'header4.xml': [p(t('Department: '), t('{{'), proof('spellStart'), t('Department'), proof('spellEnd'), t('}}'))],
  },
  footers: { 'footer1.xml': [p(t('Ref. '), simpleField(' MERGEFIELD Reference_No \\* MERGEFORMAT ', '«Reference_No»'))] },
  section2: ['header4.xml'],
  body: [
    p(t('This letter confirms the order placed last week.')),
    p(t('Thank you for choosing us.')),
    p(t('Second section starts here.')),
  ],
  sectionBreakAfter: 1,
});
makeXlsx('word-mergefield-header.xlsx', ['Company', 'Reference_No', 'Department'],
  [['Acme SIA', 'R-1001', 'Sales'], ['Baltic Ltd', 'R-1002', 'Support']]);

// 3. << Name >> chevrons, one split across runs.
await makeDocx('chevron.docx', {
  body: [
    p(t('Hello << Name >>,')),
    p(t('We will ship to <<'), t('Addr'), t('ess>> on <<Date>>.')),
    p(t('Regards, <<Name>>')),
  ],
});
makeXlsx('chevron.xlsx', ['Name', 'Address', 'Date'], [['Anna', 'Brivibas 1', '1 Dec'], ['Janis', 'Elizabetes 2', '2 Dec']]);

// 4. {{ Name }} and {{Name}}, split runs with proofing marks, and one in the header.
await makeDocx('double-brace.docx', {
  headers: { 'header1.xml': [p(t('Invoice for {{Customer}}'))] },
  body: [
    p(t('Customer: {{ Customer }}')),
    p(t('Invoice '), t('{{'), proof('spellStart'), t('Invoice_No'), proof('spellEnd'), t('}}'), t(' due {{Due Date}}.')),
  ],
});
makeXlsx('double-brace.xlsx', ['Customer', 'Invoice_No', 'Due Date'], [['Acme SIA', 'INV-1', '30 Nov'], ['Baltic Ltd', 'INV-2', '15 Dec']]);

// 5. { Name } single braces.
await makeDocx('single-brace.docx', {
  body: [
    p(t('Dear { Name },')),
    p(t('Your order {'), t('Order_No'), t('} ships to {City}.')),
  ],
});
makeXlsx('single-brace.xlsx', ['Name', 'Order_No', 'City'], [['Anna', 'A-1', 'Riga'], ['Janis', 'A-2', 'Cesis']]);

// 6. % Name % percent delimiters, next to a real percentage.
await makeDocx('percent.docx', {
  body: [
    p(t('Dear % Name %,')),
    p(t('You saved 15% on order %Order_No% shipped to %'), t('City'), t('%.')),
  ],
});
makeXlsx('percent.xlsx', ['Name', 'Order_No', 'City'], [['Anna', 'A-1', 'Riga'], ['Janis', 'A-2', 'Cesis']]);

// 7. Legacy forms the old normaliser converted silently: «Name» typed as text and ${Name}.
await makeDocx('guillemet-dollar.docx', {
  body: [p(t('Dear «Name»,')), p(t('Your code is ${Code}.'))],
});
makeXlsx('guillemet-dollar.xlsx', ['Name', 'Code'], [['Anna', 'X1'], ['Janis', 'X2']]);

// 8. Handlebars {{#each}} / {{#if}} with one simple field alongside.
await makeDocx('handlebars-each.docx', {
  body: [
    p(t('Statement for {{Customer}}')),
    p(t('{{#each rows}}')),
    p(t('{{name}} – {{amount}}')),
    p(t('{{/each}}')),
    p(t('{{#if vip}}Thank you for being a VIP.{{/if}}')),
  ],
});
makeXlsx('handlebars-each.xlsx', ['Customer'], [['Acme SIA'], ['Baltic Ltd']]);

// 8b. The same loop in a header, where docxtemplater itself reads it.
await makeDocx('handlebars-each-header.docx', {
  headers: { 'header1.xml': [p(t('{{#each rows}}{{name}}{{/each}}'))] },
  body: [p(t('Statement for {{Customer}}'))],
});
makeXlsx('handlebars-each-header.xlsx', ['Customer'], [['Acme SIA'], ['Baltic Ltd']]);

// 8c. A loop around the entire body: the one case Veidne may unwrap, since
//     one document per row is what the loop meant anyway.
await makeDocx('handlebars-each-whole.docx', {
  body: [
    p(t('{{#each rows}}')),
    p(t('Dear {{Name}},')),
    p(t('Your balance is {{ Balance }} EUR.')),
    p(t('{{/each}}')),
  ],
});
makeXlsx('handlebars-each-whole.xlsx', ['Name', 'Balance'], [['Anna', '120.00'], ['Janis', '75.50']]);

// 9. docxtemplater {#items} loop with one simple field alongside.
await makeDocx('docxtemplater-loop.docx', {
  body: [
    p(t('Order for {Customer}')),
    p(t('{#items}')),
    p(t('{product}: {qty}')),
    p(t('{/items}')),
  ],
});
makeXlsx('docxtemplater-loop.xlsx', ['Customer'], [['Acme SIA'], ['Baltic Ltd']]);

// 10. Jinja {% for %} / {% if %} with one simple field alongside.
await makeDocx('jinja-for.docx', {
  body: [
    p(t('Report for {{ Customer }}')),
    p(t('{% for line in lines %}')),
    p(t('{{ line.text }}')),
    p(t('{% endfor %}')),
    p(t('{% if paid %}Paid in full.{% endif %}')),
  ],
});
makeXlsx('jinja-for.xlsx', ['Customer'], [['Acme SIA'], ['Baltic Ltd']]);

// 11. Word IF / NEXT / NEXTIF / SKIPIF / MERGEREC / MERGESEQ codes, with a
//     MERGEFIELD nested inside the IF and one standalone MERGEFIELD.
await makeDocx('word-control-fields.docx', {
  body: [
    p(t('Dear '),
      complexField([' IF ', wordMergeField('Gender'), ' = "M" "Mr" "Ms" ', '\\* MERGEFORMAT '], 'Ms'),
      t(' '), wordMergeField('Surname'), t(',')),
    p(t('Record '), complexField([' MERGEREC '], '1'), t(' of sequence '), simpleField(' MERGESEQ ', '1')),
    p(complexField([' NEXT '], '')),
    p(complexField([' NEXTIF ', wordMergeField('Region'), ' = "North" '], '')),
    p(complexField([' SKIPIF ', wordMergeField('Active'), ' = "No" '], '')),
  ],
});
makeXlsx('word-control-fields.xlsx', ['Surname', 'Gender'], [['Ozola', 'F'], ['Berzins', 'M']]);

// 12. A plain letter with no placeholders at all.
await makeDocx('plain.docx', {
  body: [
    p(t('Dear customer,')),
    p(t('Thank you for your order. It will arrive within five working days.')),
    p(t('Kind regards, the team')),
  ],
});
makeXlsx('plain.xlsx', ['Name'], [['Anna'], ['Janis']]);

// 13. Ordinary prose and code full of braces and percent signs. Nothing in it
//     is a placeholder; the detector should offer as little as possible.
await makeDocx('prose-braces-percent.docx', {
  body: [
    p(t('Sales rose 5% in Q1 and 7% in Q2, a 12 % increase over the year.')),
    p(t('Between 40% and 60% of respondents agreed; 100%   of staff were trained.')),
    p(t('The set {1, 2, 3} has three members, and { x } is the variable.')),
    p(t('Configuration: { "name": "Anna", "retries": 3 }.')),
    p(t('function total(items) { return items.length; }')),
    p(t('In the formula f(x) = {a + b} the braces group terms.')),
    p(t('Use %PATH% and %APPDATA% on Windows; the rate is 3.5%.')),
    p(t('Margin notes: {see appendix} and {sic}.')),
    p(t('Discount 10% off, then a further 5 % off at checkout.')),
    p(t('A percent sign alone: 50 % and a brace alone: { and }.')),
  ],
});
makeXlsx('prose-braces-percent.xlsx', ['Name'], [['Anna'], ['Janis']]);

console.log(`wrote ${fs.readdirSync(DIR).length} files to ${DIR}`);
