import { memo } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import type { PdfFileStatus } from '@/features/generator/store/pdfStore';
import { DocumentGlyph, DownloadGlyph, PdfGlyph } from '../FileRowGlyphs';
import { formatFileSize } from '../../utils/formatFileSize';
import { useStyles } from './FileStatusRow.styles';

interface FileStatusRowProps {
  stem: string;
  status: PdfFileStatus;
  // The Done screen's entry lists the files before anyone asks for PDFs; there
  // is no conversion under way, so no per-row status shows until Create PDFs is
  // clicked (F8). The row still carries data-status for the store's own hooks.
  showStatus?: boolean;
  /** Size of the Word file in bytes, shown in grey before the arrow when known. */
  size?: number;
  /** Click or Enter downloads this document's Word file on its own, as a row
   *  in the non-PDF list does. Used while the row still names a .docx. */
  onDownload?: (stem: string) => void;
  /** Click or Enter downloads this row's finished PDF on its own. */
  onDownloadPdf?: (stem: string) => void;
}

/**
 * One file row. Memoized so a polling update only re-renders the rows whose
 * status actually changed (part 4/5 performance rule): props are primitive
 * values plus a stable callback, so React.memo skips unchanged rows.
 * (Failed-row styling and surfacing land in Batch 3.)
 *
 * Anatomy per the file-row mockup: document glyph on the left (the status dot
 * takes its place while a conversion runs; a finished row shows the PDF glyph
 * in PDF red, since the list can also hold failed rows and the glyph is what
 * tells the two apart along with the failed row's dot, tag and tint), name
 * with its grey extension, the size in grey, and a download arrow on the
 * right. A clickable row is a real button labelled "Download <file>".
 */
export const FileStatusRow = memo(function FileStatusRow({ stem, status, showStatus = true, size, onDownload, onDownloadPdf }: FileStatusRowProps) {
  const s = useStyles();
  const done = status === 'done';
  const failed = status === 'failed';
  const download = done ? onDownloadPdf : onDownload;
  const clickable = download !== undefined;
  const fileName = `${stem}${done ? '.pdf' : '.docx'}`;
  // A PDF's size is only known once it is fetched, so done rows show none.
  const sizeLabel = done ? null : formatFileSize(size);
  const content = (
    <>
      {done ? (
        <PdfGlyph className={s.pdfGlyph} />
      ) : showStatus ? (
        <span
          data-testid="pdf-row-icon"
          className={mergeClasses(
            s.icon,
            status === 'waiting' && s.iconWaiting,
            status === 'converting' && s.iconConverting,
            failed && s.iconFailed,
          )}
          aria-hidden="true"
        />
      ) : (
        <DocumentGlyph className={s.docGlyph} />
      )}
      <span className={mergeClasses(s.name, showStatus && status === 'waiting' && s.nameWaiting)}>
        {stem}
        <span data-testid="pdf-row-ext" className={mergeClasses(s.ext, done && s.extDone)}>{done ? '.pdf' : '.docx'}</span>
      </span>
      {showStatus && status === 'converting' && (
        <span className={mergeClasses(s.tag, s.tagConverting)}>{t('pdf.row.converting')}</span>
      )}
      {showStatus && failed && <span className={mergeClasses(s.tag, s.tagFailed)}>{t('pdf.row.failed')}</span>}
      {showStatus && status === 'waiting' && <span className={s.srOnly}>{t('pdf.row.waiting')}</span>}
      {showStatus && done && <span className={s.srOnly}>{t('pdf.row.done')}</span>}
      {sizeLabel && <span className={s.size}>{sizeLabel}</span>}
      {clickable && <DownloadGlyph className={s.downloadGlyph} />}
    </>
  );
  return (
    <li
      className={mergeClasses(s.row, showStatus && failed && s.rowFailed)}
      data-testid="pdf-row"
      data-stem={stem}
      data-status={status}
    >
      {clickable ? (
        <button
          type="button"
          className={mergeClasses(s.inner, s.innerClickable)}
          aria-label={t('pdf.row.download', { name: fileName })}
          onClick={() => download(stem)}
        >
          {content}
        </button>
      ) : (
        <div className={s.inner}>{content}</div>
      )}
    </li>
  );
});
