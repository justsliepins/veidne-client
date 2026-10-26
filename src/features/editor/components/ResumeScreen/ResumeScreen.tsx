import { DocumentTextRegular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { getPlaceholderColor } from '@/features/editor/utils/placeholderColors';
import { DropZone } from '@/shared/components/DropZone';
import type { SavedSession } from '../../utils/sessionPersistence';
import { useStyles } from './ResumeScreen.styles';

interface Props {
  session: SavedSession;
  onContinue: () => void;
  onStartFresh: () => void;
  onFile: (file: File) => void;
  onFileError?: (err: { message: string }) => void;
}

function relativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 60) { const m = Math.max(1, mins); return m === 1 ? t('resume.started.minute') : t('resume.started.minutes', { count: String(m) }); }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? t('resume.started.hour') : t('resume.started.hours', { count: String(hrs) });
  const days = Math.floor(hrs / 24);
  if (days === 1) return t('resume.started.yesterday');
  if (days < 7) return t('resume.started.days', { count: String(days) });
  const weeks = Math.floor(days / 7);
  if (days < 30) return weeks === 1 ? t('resume.started.week') : t('resume.started.weeks', { count: String(weeks) });
  return t('resume.started.overMonth');
}

export function ResumeScreen({ session, onContinue, onStartFresh, onFile, onFileError }: Props) {
  const s = useStyles();
  const phs = session.placeholders as Array<{ name: string; colorIndex: number }>;
  return (
    <div className={s.root}>
      <div className={s.card}>
        <h2 className={s.title}>{t('resume.title')}</h2>
        <div className={s.fileName}><DocumentTextRegular /> {session.sourceFileName}</div>
        <div className={s.fields}>
          {phs.length === 1 ? t('resume.fieldsSingular') : t('resume.fields', { count: String(phs.length) })}
          {phs.slice(0, 8).map((p, i) => {
            const c = getPlaceholderColor(p.colorIndex);
            return <span key={i} className={s.chip} style={{ backgroundColor: c.bg, color: c.chipText }}>{p.name}</span>;
          })}
        </div>
        <time className={s.timestamp} dateTime={new Date(session.savedAt).toISOString()}>{relativeTime(session.savedAt)}</time>
        <div className={s.actions}>
          <button type="button" className={s.btnContinue} onClick={onContinue}>{t('resume.continue')}</button>
          <button type="button" className={s.btnFresh} onClick={onStartFresh}>{t('resume.startFresh')}</button>
        </div>
      </div>
      <div className={s.dragHint}>{t('resume.dragNew')}</div>
      <DropZone accept={['.docx']} onFile={onFile} onError={onFileError} titleKey="dropZone.title" subtitleKey="dropZone.subtitle" formatHintKey="dropZone.formats" />
    </div>
  );
}
