import * as XLSX from 'xlsx';
import { triggerDownload } from '@/features/generator/utils/downloadHelpers';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Build the column-matched data spreadsheet: one column per field, ready for
 * the user to fill one row per document. Single source of truth for the data
 * file offered both by the Data step's "Create one for me" and the editor
 * Download menu.
 */
export function buildKitSpreadsheet(
  fieldNames: string[],
  originalFileName: string,
): { blob: Blob; fileName: string } {
  const ws = XLSX.utils.aoa_to_sheet([fieldNames]);
  ws['!cols'] = fieldNames.map((name) => ({ wch: Math.max(name.length + 4, 15) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: XLSX_MIME });
  const fileName = originalFileName.replace(/\.docx$/i, '') + '_data.xlsx';
  return { blob, fileName };
}

export function generateKitSpreadsheet(fieldNames: string[], originalFileName: string): void {
  const { blob, fileName } = buildKitSpreadsheet(fieldNames, originalFileName);
  triggerDownload(blob, fileName);
}
