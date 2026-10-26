import { useShallow } from 'zustand/react/shallow';
import { Dialog, DialogSurface, ProgressBar } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { VeidneButton } from '@/shared/components/VeidneButton/VeidneButton';
import { useGeneratorStore } from '../../store/generatorStore';
import { useStyles } from './GenerateProgressModal.styles';

interface GenerateProgressModalProps {
  open: boolean;
  onCancel: () => void;
}

export function GenerateProgressModal({ open, onCancel }: GenerateProgressModalProps) {
  const s = useStyles();
  const { progress, currentRow, totalRows } = useGeneratorStore(
    useShallow((s) => ({ progress: s.progress, currentRow: s.currentRow, totalRows: s.totalRows })),
  );

  return (
    <Dialog open={open} modalType="alert">
      <DialogSurface className={s.surface}>
        <div className={s.title}>{t('generate.progress.title')}</div>
        <ProgressBar value={progress} className={s.bar}
          shape="rounded" thickness="large" />
        <div className={s.counter}>
          {t('generate.progress.counter', {
            current: String(currentRow),
            total: String(totalRows),
          })}
        </div>
        <div className={s.cancelWrapper}>
          <VeidneButton appearance="secondary" onClick={onCancel}>
            {t('generate.progress.cancel')}
          </VeidneButton>
        </div>
      </DialogSurface>
    </Dialog>
  );
}
