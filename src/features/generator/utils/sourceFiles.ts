import { trackEvent } from '@/services/analyticsService';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';
import { createTaggedTemplate } from './documentTagger';
import { triggerDownload } from './downloadHelpers';

// The user's own files, offered back to them. Generating clears the saved
// session (Editor's phase watcher), so after that point the tagged template
// exists only in memory; these downloads are the way to keep it. Every call
// records template_downloaded with the file kind and the place it came from.

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Where a source-file download was offered. */
export type SourceFilePlace = 'data_step' | 'generate' | 'done' | 'editor_download_menu';

export function templateBaseName(fileName: string | null): string {
  return (fileName ?? '').replace(/\.docx$/i, '') || 'document';
}

/** True when the editor holds a document with at least one field, i.e. there
 *  is a tagged template worth saving. */
export function hasTaggedTemplate(): boolean {
  const e = useEditorStore.getState();
  return e.rawDocxBytes !== null && e.placeholders.length > 0;
}

/** The uploaded document with {{FIELD}} tags written in, as produced for
 *  generation. Re-uploading it recreates the fields with no clicks. */
export function downloadTaggedTemplate(place: SourceFilePlace): void {
  const { rawDocxBytes, placeholders, wordTokens, fileName } = useEditorStore.getState();
  if (!rawDocxBytes || placeholders.length === 0) return;
  const tagged = createTaggedTemplate(rawDocxBytes, placeholders, wordTokens);
  triggerDownload(new Blob([tagged], { type: DOCX_MIME }), `${templateBaseName(fileName)}_template.docx`);
  trackEvent('template_downloaded', { file: 'docx', source: place });
}

/** True when the data store still holds the bytes of the spreadsheet the
 *  user uploaded (never for sample data or a kit filled elsewhere). */
export function hasUploadedSpreadsheet(): boolean {
  return useDataStore.getState().rawXlsxBytes !== null;
}

/** The spreadsheet exactly as uploaded, byte for byte. Nothing is rebuilt
 *  from the parsed rows, so what comes back is what went in. */
export function downloadUploadedSpreadsheet(place: SourceFilePlace): void {
  const { rawXlsxBytes, fileName } = useDataStore.getState();
  if (!rawXlsxBytes) return;
  triggerDownload(new Blob([rawXlsxBytes], { type: XLSX_MIME }), fileName || 'data.xlsx');
  trackEvent('template_downloaded', { file: 'xlsx', source: place });
}
