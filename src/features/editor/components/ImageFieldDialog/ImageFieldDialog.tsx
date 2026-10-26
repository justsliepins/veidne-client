import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogSurface, Input } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { useStyles } from './ImageFieldDialog.styles';

interface ImageFieldDialogProps {
  open: boolean;
  /** Set when the clicked picture is already tagged: the dialog offers
   *  Remove field instead of name entry. */
  existingFieldName: string | null;
  onCreate: (name: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function ImageFieldDialog({ open, existingFieldName, onCreate, onRemove, onClose }: ImageFieldDialogProps) {
  const s = useStyles();
  const [name, setName] = useState('');
  const [prevOpen, setPrevOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the draft when the dialog opens (render-time state sync, mirroring
  // PlaceholderPopover, so no setState inside an effect).
  if (open && !prevOpen) { setPrevOpen(true); setName(''); }
  if (!open && prevOpen) setPrevOpen(false);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  }, [open]);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed) onCreate(trimmed);
  }, [name, onCreate]);

  const liveName = name.trim() || 'NAME';

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
      <DialogSurface className={s.surface}>
        <h2 className={s.title}>{t('imageField.dialog.title')}</h2>

        {existingFieldName ? (
          <>
            <p className={s.helper}>
              <span className={s.fieldChip}>{existingFieldName}</span>
            </p>
            <div className={s.buttonRow}>
              <VeidneButton appearance="transparent" onClick={onClose}>
                {t('imageField.dialog.cancel')}
              </VeidneButton>
              <VeidneButton appearance="primary" onClick={onRemove}>
                {t('imageField.dialog.remove')}
              </VeidneButton>
            </div>
          </>
        ) : (
          <>
            <label className={s.label} htmlFor="image-field-name">
              {t('imageField.dialog.nameLabel')}
            </label>
            <Input
              id="image-field-name"
              ref={inputRef}
              className={s.input}
              value={name}
              onChange={(_, data) => setName(data.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
              placeholder={t('imageField.dialog.namePlaceholder')}
            />
            <p className={s.helper}>
              {t('imageField.dialog.helperBefore')}
              <span className={s.fieldChip}>{liveName}</span>
              {t('imageField.dialog.helperAfter')}
            </p>
            <div className={s.buttonRow}>
              <VeidneButton appearance="transparent" onClick={onClose}>
                {t('imageField.dialog.cancel')}
              </VeidneButton>
              <VeidneButton appearance="primary" onClick={handleCreate} disabled={!name.trim()}>
                {t('imageField.dialog.create')}
              </VeidneButton>
            </div>
          </>
        )}
      </DialogSurface>
    </Dialog>
  );
}
