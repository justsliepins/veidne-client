import { useState, useEffect } from 'react';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { submitSuggestion } from '@/services/suggestionService';
import { useStyles } from './SuggestionModal.styles';

interface SuggestionModalProps {
  open: boolean; onClose: () => void; stripeSessionId: string;
}

export function SuggestionModal({ open, onClose, stripeSessionId }: SuggestionModalProps) {
  const s = useStyles();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) { const id = setTimeout(() => { onClose(); setSuccess(false); setTitle(''); setDescription(''); }, 2000); return () => clearTimeout(id); }
  }, [success, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      await submitSuggestion({ title: title.trim(), description: description.trim(), stripeSessionId });
      trackEvent('suggestion_submitted');
      setSuccess(true); setLoading(false);
    } catch (e) { setError(e instanceof Error ? e.message : t('suggestion.modal.error')); setLoading(false); }
  };

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !loading;

  if (success) return (
    <div className={s.overlay} onClick={handleBackdrop}>
      <div className={s.card} role="dialog" aria-modal="true">
        <div className={s.success}>{t('suggestion.modal.success')}</div>
      </div>
    </div>
  );

  return (
    <div className={s.overlay} onClick={handleBackdrop}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="suggestion-modal-title">
        <div className={s.titleRow}>
          <div id="suggestion-modal-title" className={s.title}>{t('suggestion.modal.title')}</div>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label={t('common.close')}><Dismiss24Regular /></button>
        </div>
        <div className={s.subtitle}>{t('suggestion.modal.subtitle')}</div>
        <div>
          <div className={s.label}>{t('suggestion.modal.titleField')}</div>
          <input className={s.input} type="text" value={title} maxLength={200}
            placeholder={t('suggestion.modal.titlePlaceholder')} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <div className={s.label}>{t('suggestion.modal.descriptionField')}</div>
          <textarea className={s.textarea} value={description} maxLength={2000}
            placeholder={t('suggestion.modal.descriptionPlaceholder')} onChange={e => setDescription(e.target.value)} />
        </div>
        <button type="button" className={s.cta} disabled={!canSubmit} onClick={handleSubmit}>
          {t('suggestion.modal.submit')}
        </button>
        {error && <div className={s.error}>{error}</div>}
      </div>
    </div>
  );
}
