import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { submitBugReport } from '@/services/bugReportService';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
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
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  // Each message sits next to the field it is about (FORM-19); `error` is the
  // send failure, shown under the button.
  const [emailError, setEmailError] = useState('');
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // The thank-you stays until the user closes it (FB-24); closing after a
  // successful send also clears the form for the next report.
  const close = useCallback(() => {
    if (success) {
      setSuccess(false); setSubject(''); setBody(''); setEmail(''); setImage(null);
    }
    onClose();
  }, [success, onClose]);

  useDialogFocus(open, cardRef, titleRef, close);

  // The Send button is replaced by the thank-you; keep focus in the dialog.
  useEffect(() => {
    if (success) requestAnimationFrame(() => doneRef.current?.focus());
  }, [success]);

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
      setImageError(validationError);
      e.target.value = '';
      return;
    }
    setImageError('');
    setImage(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    setError('');
    setEmailError('');

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(t('bugReport.modal.invalidEmail'));
      emailRef.current?.focus();
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

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) close(); };
  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !loading;

  return createPortal(
    <div className={s.overlay} onClick={handleBackdrop}>
      <div ref={cardRef} className={s.card} role="dialog" aria-modal="true" aria-labelledby="bug-report-modal-title">
        <div className={s.titleRow}>
          <h2 id="bug-report-modal-title" ref={titleRef} tabIndex={-1} className={s.title}>{t('bugReport.modal.title')}</h2>
          <button type="button" className={s.closeBtn} onClick={close} aria-label={t('common.close')}>
            <Dismiss24Regular />
          </button>
        </div>

        {/* In the dialog from the start and filled on success, so the thank-you
            is announced while focus moves to Close (WCAG 4.1.3). */}
        <p id="bug-report-status" className={success ? s.success : s.srOnly} role="status">{success ? t('bugReport.modal.success') : ''}</p>
        {success ? (
          <button type="button" ref={doneRef} className={s.cta} onClick={close} aria-describedby="bug-report-status">{t('common.close')}</button>
        ) : (
          <>
            <div className={s.subtitle}>{t('bugReport.modal.subtitle')}</div>

            <div>
              <label htmlFor="bug-report-subject" className={s.label}>{t('bugReport.modal.subjectField')}</label>
              <input id="bug-report-subject" className={s.input} type="text" value={subject} maxLength={100}
                placeholder={t('bugReport.modal.subjectPlaceholder')} onChange={e => setSubject(e.target.value)} />
            </div>

            <div>
              <label htmlFor="bug-report-body" className={s.label}>{t('bugReport.modal.bodyField')}</label>
              <textarea id="bug-report-body" className={s.textarea} value={body} maxLength={2000}
                placeholder={t('bugReport.modal.bodyPlaceholder')} onChange={e => setBody(e.target.value)} />
            </div>

            <div>
              <label htmlFor="bug-report-email" className={s.label}>{t('bugReport.modal.emailField')}</label>
              <input id="bug-report-email" ref={emailRef} className={s.input} type="email" value={email}
                autoComplete="email" aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'bug-report-email-hint bug-report-email-error' : 'bug-report-email-hint'}
                placeholder="you@example.com" onChange={e => { setEmail(e.target.value); setEmailError(''); }} />
              <div id="bug-report-email-hint" className={s.hint}>{t('bugReport.modal.emailHint')}</div>
              {emailError && <div id="bug-report-email-error" className={s.fieldError} role="alert">{emailError}</div>}
            </div>

            <div>
              <div id="bug-report-image-label" className={s.label}>{t('bugReport.modal.imageField')}</div>
              <div className={s.fileRow}>
                <button type="button" className={s.fileBtn} onClick={() => fileInputRef.current?.click()}
                  aria-describedby="bug-report-image-label bug-report-image-hint">
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
              <div id="bug-report-image-hint" className={s.hint}>{t('bugReport.modal.imageHint')}</div>
              {imageError && <div className={s.fieldError} role="alert">{imageError}</div>}
              <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg" tabIndex={-1}
                aria-label={t('bugReport.modal.imageField')}
                style={{ display: 'none' }} onChange={handleFileChange} />
            </div>

            {/* What leaves the device, said where it leaves (journey audit 4a, Obligāti 4). */}
            <p className={s.hint}>{t('bugReport.modal.privacy')}</p>

            <button type="button" className={s.cta} disabled={!canSubmit} onClick={handleSubmit}>
              {loading ? t('bugReport.modal.sending') : t('bugReport.modal.submit')}
            </button>
            {error && <div className={s.error} role="alert">{error}</div>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
