import PizZip from 'pizzip';
import type { WordToken } from '@/features/editor/utils/types';

const PARAGRAPHS = [
  'Dear Sarah,', '',
  "You're invited to our Annual Team Gathering!", '',
  'Date: Friday, March 14th',
  'Location: Portland Office, Main Hall',
  'Time: 6:00 PM', '',
  "We'd love to see you there, Sarah. Please confirm your attendance with your manager, David, by March 7th.", '',
  'Looking forward to a great evening!', '',
  'Best regards,',
  'The Events Team',
];

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textToTokens(paragraphs: string[]): WordToken[] {
  const tokens: WordToken[] = [];
  let id = 0;
  paragraphs.forEach((para, pIdx) => {
    if (pIdx > 0) tokens.push({ id: `w-${id++}`, text: '\n', type: 'newline', paragraphIndex: pIdx });
    if (!para) return;
    const parts = para.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      tokens.push({ id: `w-${id++}`, text: part, type: /^\s+$/.test(part) ? 'space' : 'word', paragraphIndex: pIdx });
    }
  });
  return tokens;
}

function buildHtml(paragraphs: string[]): string {
  return paragraphs.map(p => `<p>${escapeXml(p)}</p>`).join('');
}

function buildDocxBytes(paragraphs: string[]): ArrayBuffer {
  const zip = new PizZip();
  zip.file('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>');
  zip.file('_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>');
  zip.file('word/_rels/document.xml.rels',
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  const body = paragraphs.map(p =>
    p ? `<w:p><w:r><w:t xml:space="preserve">${escapeXml(p)}</w:t></w:r></w:p>` : '<w:p/>'
  ).join('');
  zip.file('word/document.xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + body + '</w:body></w:document>');
  return zip.generate({ type: 'arraybuffer' });
}

export function createSampleDocument() {
  return { tokens: textToTokens(PARAGRAPHS), html: buildHtml(PARAGRAPHS), rawDocxBytes: buildDocxBytes(PARAGRAPHS) };
}
