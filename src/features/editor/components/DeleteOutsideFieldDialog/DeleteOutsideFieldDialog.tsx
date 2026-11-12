import { Dialog, DialogSurface } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { VeidneButton } from '@/shared/components/VeidneButton';
import type { Placeholder } from '../../utils/types';
import { useStyles } from './DeleteOutsideFieldDialog.styles';

/** Asks before deleting a field that is only in headers or footers (see
 *  isOutsideOnly): its {{tag}} stays in those parts, which the editor does
 *  not show, so the dialog names the exact text every document will hold. */
interface DeleteOutsideFieldDialogProps {
  field: Placeholder | null;
  onDelete: () => void;
  onCancel: () => void;
}

export function DeleteOutsideFieldDialog({ field, onDelete, onCancel }: DeleteOutsideFieldDialogProps) {
  const s = useStyles();
  const outside = field?.outsideBody;
  const parts = outside?.parts ?? [];
  const where = parts.includes('header') && parts.includes('footer')
    ? 'headerFooter' : parts.includes('footer') ? 'footer' : 'header';
  // The text the header or footer holds: the tag written at import, which a
  // rename does not change in the file.
  const tag = outside ? `{{${outside.tag}}}` : '';
  const [before, after] = t('placeholder.deleteOutside.result', { tag: '\u0000' }).split('\u0000');
  return (
    <Dialog open={field !== null} modalType="alert" onOpenChange={(_, data) => { if (!data.open) onCancel(); }}>
      <DialogSurface className={s.surface} aria-labelledby="delete-outside-title" data-testid="delete-outside-dialog">
        <h2 id="delete-outside-title" className={s.title}>{t('placeholder.deleteOutside.title', { name: field?.name ?? '' })}</h2>
        <p className={s.text}>{t(`placeholder.deleteOutside.where.${where}`, { name: field?.name ?? '' })}</p>
        <p className={s.text} data-testid="delete-outside-result">
          {before}<code className={s.tag}>{tag}</code>{after}
        </p>
        <p className={s.text}>{t('placeholder.deleteOutside.fix')}</p>
        <div className={s.buttonRow}>
          <VeidneButton appearance="secondary" onClick={onCancel}>{t('placeholder.deleteOutside.keep')}</VeidneButton>
          <VeidneButton appearance="primary" onClick={onDelete}>{t('placeholder.deleteOutside.confirm')}</VeidneButton>
        </div>
      </DialogSurface>
    </Dialog>
  );
}
