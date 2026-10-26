import { ArrowDownload16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { getPlaceholderColor } from '@/features/editor/utils/placeholderColors';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';
import { downloadTaggedTemplate } from '@/features/generator/utils/sourceFiles';
import { triggerDownload } from '@/features/generator/utils/downloadHelpers';
import { templateBaseName } from '@/features/generator/utils/sourceFiles';
import { buildKitSpreadsheet } from '../../utils/generateKitSpreadsheet';
import { useStyles } from './DataUploadGuidance.styles';

// sessionPersistence keeps the document only while the JSON stays under
// 4,194,304 characters; base64 grows bytes by 4/3, so about 3 MB of .docx.
const RESTORABLE_DOCX_BYTES = 3_000_000;

interface DataUploadGuidanceProps {
  placeholders: { name: string; colorIndex: number }[];
}

export function DataUploadGuidance({ placeholders }: DataUploadGuidanceProps) {
  const s = useStyles();
  const hasTemplate = useEditorStore((e) => e.rawDocxBytes !== null);
  const docName = useEditorStore((e) => e.fileName);
  // The saved-in-this-browser note is shown only when the save is actually
  // restorable: sessionPersistence drops the document bytes above its size
  // cap, and skips sample data, and a restore needs those bytes.
  const restorable = useEditorStore((e) => e.rawDocxBytes !== null && e.rawDocxBytes.byteLength <= RESTORABLE_DOCX_BYTES);
  const isSampleData = useDataStore((d) => d.isSampleData);
  const isSaved = restorable && !isSampleData;

  // The same blank spreadsheet the kit flow and the editor Download menu
  // build: one column per field, named after the document.
  const handleDownloadSpreadsheet = () => {
    const { blob, fileName } = buildKitSpreadsheet(placeholders.map(p => p.name), `${templateBaseName(docName)}.docx`);
    triggerDownload(blob, fileName);
    trackEvent('template_downloaded', { file: 'xlsx', source: 'data_step' });
  };

  if (placeholders.length === 0) return null;

  return (
    <div className={s.root}>
      <p className={s.title}>{t('upload.guidance.title')}</p>
      <div className={s.chips}>
        {placeholders.map(ph => {
          const color = getPlaceholderColor(ph.colorIndex);
          return (
            <span key={ph.name} className={s.chip} style={{ backgroundColor: color.bg, color: color.dot }}>
              <span className={s.chipDot} style={{ backgroundColor: color.dot }} />
              {ph.name}
            </span>
          );
        })}
      </div>
      <p className={s.subtitle}>{t('upload.guidance.subtitle')}</p>
      {/* The blank spreadsheet is this screen's next step, so it is the
          button. The template (the user's own document with its fields
          marked) is a safety copy with nothing to do with the task at hand,
          so it is a quiet link under it. */}
      <div className={s.downloads}>
        <button type="button" className={s.downloadBtn} onClick={handleDownloadSpreadsheet}>
          <ArrowDownload16Regular />
          {t('upload.download_xlsx')}
        </button>
        {hasTemplate && (
          <button type="button" className={s.downloadLink} onClick={() => downloadTaggedTemplate('data_step')}>
            {t('upload.download_docx')}
          </button>
        )}
      </div>
      {isSaved && <p className={s.savedNote}>{t('upload.savedNote')}</p>}
    </div>
  );
}
