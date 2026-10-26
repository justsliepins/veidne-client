import JSZip from 'jszip';
import type { Placeholder } from '@/features/editor/utils/types';

// Dev-only fixtures for the PDF E2E seed route. Mirrors the Batch 1 harness
// Word-path fixture: a minimal valid .docx template carrying a [[Name]] token,
// run through the REAL generation pipeline so the PDF flow under test operates
// on real generated documents. Never imported by the production build.

export const FIXTURE_BASE_NAME = 'Fixtures';
export const FIXTURE_COLUMN_MAPPING: Record<string, string> = { Name: 'Name' };
export const FIXTURE_PLACEHOLDERS: Placeholder[] = [
  { id: 'p1', name: 'Name', originalText: '[[Name]]', colorIndex: 0, occurrences: [] },
];

/** A minimal valid .docx (OPC zip) template with a [[Name]] merge token. */
export async function buildFixtureTemplate(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      '<w:p><w:r><w:t>Document for [[Name]]</w:t></w:r></w:p>' +
      '</w:body></w:document>',
  );
  return zip.generateAsync({ type: 'arraybuffer' });
}

/** n rows with unique, predictable stems Doc_1 .. Doc_n (no dedup needed). */
export function buildFixtureRows(n: number): Record<string, string>[] {
  return Array.from({ length: n }, (_, i) => ({ Name: `Doc_${i + 1}` }));
}
