import { useRef, useState, useCallback } from 'react';
import { mergeClasses, Spinner } from '@fluentui/react-components';
import { DocumentTextRegular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { VeidneButton } from '@/shared/components/VeidneButton/VeidneButton';
import { useStyles } from './DropZone.styles';

export interface FileError { type: 'wrongType' | 'tooLarge' | 'corrupt'; message: string }

interface DropZoneProps {
  accept: string[];
  onFile: (file: File) => void;
  onError?: (error: FileError) => void;
  /** Hard ceiling checked BEFORE any parsing; oversized files never leave
   *  this screen. */
  sizeLimitMB?: number;
  /** i18n key for the too-large message, plain and file-type specific. */
  tooLargeKey?: string;
  /** Short reassurance line under the zone (privacy moment). */
  reassuranceKey?: string;
  icon?: React.ComponentType<{ className?: string }>;
  titleKey: string;
  subtitleKey: string;
  formatHintKey: string;
  /** i18n key for the wrong-type message, so each step can be plain and specific. */
  wrongTypeKey?: string;
  /** Show a parsing indicator while the parent processes the chosen file. */
  loading?: boolean;
}

function isAccepted(file: File, accept: string[]) {
  return accept.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));
}

export function DropZone({ accept, onFile, onError: _onError, icon: Icon = DocumentTextRegular, titleKey, subtitleKey, formatHintKey, wrongTypeKey = 'error.file.wrongType', sizeLimitMB = 15, tooLargeKey = 'error.file.tooLarge', reassuranceKey, loading = false }: DropZoneProps) {
  const s = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  // Rejections render inline inside the zone and persist until the next
  // attempt; nothing transient, nothing far from the action.
  const [rejection, setRejection] = useState<string | null>(null);

  // Validate type and size up front, before any parsing is attempted.
  const validate = useCallback((file: File): boolean => {
    if (!isAccepted(file, accept)) { setRejection(t(wrongTypeKey, { formats: accept.join(', ') })); return false; }
    if (file.size > sizeLimitMB * 1024 * 1024) { setRejection(t(tooLargeKey, { limit: String(sizeLimitMB) })); return false; }
    setRejection(null);
    return true;
  }, [accept, wrongTypeKey, sizeLimitMB, tooLargeKey]);

  const openBrowse = useCallback(() => inputRef.current?.click(), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (loading) return;
    const file = e.dataTransfer.files[0];
    if (file && validate(file)) onFile(file);
  }, [validate, onFile, loading]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!loading) setOver(true);
  }, [loading]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validate(file)) onFile(file);
    e.target.value = '';
  }, [validate, onFile]);

  if (loading) {
    return (
      <div className={s.root} aria-busy="true">
        <Spinner size="medium" />
        <span className={s.title}>{t('dropZone.processing')}</span>
      </div>
    );
  }

  // The whole zone is click-to-browse; the Browse button is the labelled,
  // keyboard-focusable control (so we avoid a button nested in a button role).
  return (
    <div
      className={mergeClasses(s.root, over && s.dragOver)}
      onClick={openBrowse}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
    >
      <Icon className={s.icon} />
      <span className={s.title}>{t(titleKey)}</span>
      <span className={s.subtitle}>{t(subtitleKey)}</span>
      <VeidneButton appearance="primary" size="small"
        onClick={(e) => { e.stopPropagation(); openBrowse(); }}>
        {t('dropZone.browse')}
      </VeidneButton>
      <span className={s.formatHint}>{t(formatHintKey, { formats: accept.join(', ') })}</span>
      {rejection && <div className={s.inlineError} role="alert" data-testid="dropzone-error">{rejection}</div>}
      {reassuranceKey && <span className={s.reassurance}>{t(reassuranceKey)}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        className={s.hidden}
        aria-label={t('a11y.dropZone', { formats: accept.join(', ') })}
        onChange={handleInputChange}
      />
    </div>
  );
}
