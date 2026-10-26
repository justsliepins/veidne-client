import { useState, useEffect, useRef } from 'react';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { submitBugReport } from '@/services/bugReportService';
import { useStyles } from './BugReportModal.styles';

interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

export function BugReportModal({ open, onClose }: BugReportModalProps) {
  const s = useStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const id = setTimeout(() => {
        onClose();
        setSuccess(false);
        setSubject('');
        setBody('');
        setEmail('');
        setImage(null);
      }, 2000);
      return () => clearTimeout(id);
    }
  }, [success, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return t('bugReport.modal.imageWrongType');
    if (file.size > MAX_IMAGE_SIZE) return t('bugReport.modal.imageTooLarge');
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }
    setError('');
    setImage(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    setError('');

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('bugReport.modal.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      await submitBugReport({
        subject: subject.trim(),
        body: body.trim(),
        email: email.trim() || undefined,
        image: image ?? undefined,
      });
      trackEvent('bug_report_submitted');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('bugReport.modal.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };
  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !loading;

  if (success) return (
    <div className={s.overlay} onClick={handleBackdrop}>
      <div className={s.card} role="dialog" aria-modal="true">
        <div className={s.success}>{t('bugReport.modal.success')}</div>
      </div>
    </div>
  );

  return (
    <div className={s.overlay} onClick={handleBackdrop}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="bug-report-modal-title">
        <div className={s.titleRow}>
          <div id="bug-report-modal-title" className={s.title}>{t('bugReport.modal.title')}</div>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label={t('common.close')}>
            <Dismiss24Regular />
          </button>
        </div>

        <div className={s.subtitle}>{t('bugReport.modal.subtitle')}</div>

        <div>
          <div className={s.label}>{t('bugReport.modal.subjectField')}</div>
          <input className={s.input} type="text" value={subject} maxLength={100}
            placeholder={t('bugReport.modal.subjectPlaceholder')} onChange={e => setSubject(e.target.value)} />
        </div>

        <div>
          <div className={s.label}>{t('bugReport.modal.bodyField')}</div>
          <textarea className={s.textarea} value={body} maxLength={2000}
            placeholder={t('bugReport.modal.bodyPlaceholder')} onChange={e => setBody(e.target.value)} />
        </div>

        <div>
          <div className={s.label}>{t('bugReport.modal.emailField')}</div>
          <input className={s.input} type="email" value={email}
            placeholder="you@example.com" onChange={e => setEmail(e.target.value)} />
          <div className={s.hint}>{t('bugReport.modal.emailHint')}</div>
        </div>

        <div>
          <div className={s.label}>{t('bugReport.modal.imageField')}</div>
          <div className={s.fileRow}>
            <button type="button" className={s.fileBtn} onClick={() => fileInputRef.current?.click()}>
              {t('bugReport.modal.imageChoose')}
            </button>
            {image && (
              <>
                <span className={s.fileName}>{image.name}</span>
                <button type="button" className={s.fileRemove} onClick={handleRemoveImage}>
                  {t('bugReport.modal.imageRemove')}
                </button>
              </>
            )}
          </div>
          <div className={s.hint}>{t('bugReport.modal.imageHint')}</div>
          <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg"
            style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        <button type="button" className={s.cta} disabled={!canSubmit} onClick={handleSubmit}>
          {loading ? t('bugReport.modal.sending') : t('bugReport.modal.submit')}
        </button>
        {error && <div className={s.error}>{error}</div>}
      </div>
    </div>
  );
}
