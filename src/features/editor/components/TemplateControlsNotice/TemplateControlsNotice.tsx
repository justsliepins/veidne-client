import { mergeClasses } from '@fluentui/react-components';
import { Warning20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import type { ControlFinding } from '../../utils/placeholderDetector';
import { describeControlTags } from '../../utils/controlTags';
import { useStyles } from './TemplateControlsNotice.styles';

interface TemplateControlsNoticeProps {
  controls: ControlFinding[];
  /** 'data' on the Data step and the preview: says plainly that adding data
   *  will not get past the refusal, so nobody matches columns first and only
   *  learns at Generate. */
  step?: 'fields' | 'data';
  /** On a screen of its own (the data upload screens) rather than above the
   *  document: centred, with the width of the content under it. */
  standalone?: boolean;
}

/** Stays on screen at every step while a loop or condition from another tool
 *  is in the template, so the reason Generate is refused is never out of sight. */
export function TemplateControlsNotice({ controls, step = 'fields', standalone = false }: TemplateControlsNoticeProps) {
  const s = useStyles();
  if (controls.length === 0) return null;
  const tags = describeControlTags(controls);
  return (
    <div className={mergeClasses(s.root, standalone && s.standalone)} role="status"
      data-testid="template-controls-notice" data-step={step}>
      <Warning20Regular className={s.icon} aria-hidden="true" />
      <div>
        <p className={s.title}>{t('controls.notice.title')}</p>
        <p className={s.text}>{t(step === 'data' ? 'controls.notice.data' : 'controls.notice', { tags })}</p>
      </div>
    </div>
  );
}
