import { Warning20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import type { ControlFinding } from '../../utils/placeholderDetector';
import { describeControlTags } from '../../utils/controlTags';
import { useStyles } from './TemplateControlsNotice.styles';

interface TemplateControlsNoticeProps {
  controls: ControlFinding[];
}

/** Stays above the document while a loop or condition from another tool is
 *  in the template, so the reason Generate is refused is never out of sight. */
export function TemplateControlsNotice({ controls }: TemplateControlsNoticeProps) {
  const s = useStyles();
  if (controls.length === 0) return null;
  return (
    <div className={s.root} role="status" data-testid="template-controls-notice">
      <Warning20Regular className={s.icon} aria-hidden="true" />
      <p className={s.text}>{t('controls.notice', { tags: describeControlTags(controls) })}</p>
    </div>
  );
}
