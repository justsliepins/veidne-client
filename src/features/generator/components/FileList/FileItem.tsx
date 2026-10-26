import { t } from '@/i18n/i18n';
import { DocumentGlyph, DownloadGlyph } from '../FileRowGlyphs';
import { formatFileSize } from '../../utils/formatFileSize';
import { useStyles } from './FileItem.styles';

interface FileItemProps {
  name: string;
  /** Size in bytes; the row shows it in grey when known. */
  size?: number;
  onDownload: () => void;
}

// Same anatomy as the PDF branch's rows (the file-row mockup): document glyph,
// name with its grey extension, size, download arrow. A real button so it
// works with a keyboard and a screen reader.
export function FileItem({ name, size, onDownload }: FileItemProps) {
  const s = useStyles();
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const sizeLabel = formatFileSize(size);

  return (
    <button type="button" className={s.root} onClick={onDownload} aria-label={t('pdf.row.download', { name })}>
      <DocumentGlyph className={s.icon} />
      <span className={s.name}>{stem}<span className={s.ext}>{ext}</span></span>
      {sizeLabel && <span className={s.size}>{sizeLabel}</span>}
      <DownloadGlyph className={s.download} />
    </button>
  );
}
