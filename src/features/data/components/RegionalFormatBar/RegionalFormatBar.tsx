import { useState } from 'react';
import { mergeClasses, useId } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import type { RegionalColumns } from '../../utils/excelParser';
import { DATE_STYLE_EXAMPLES, numberStyleExample, type FormatConventions } from '../../utils/localeFormats';
import { RegionalFormatChoice } from '../RegionalFormatChoice';
import { useStyles } from './RegionalFormatBar.styles';

interface RegionalFormatBarProps {
  regional: RegionalColumns;
  value: FormatConventions;
  onChange: (next: Partial<FormatConventions>) => void;
  /** 'bar': full width under the data-loaded bar (768 px and wider).
   *  'card': inside the preview panel, which covers the page below 768 px. */
  variant?: 'bar' | 'card';
}

/**
 * Persistent line in the preview: how dates and numbers come out, and the
 * same choice as in the column matching, opened in place. The preview changes
 * as soon as a style is picked, so a wrong guess noticed in the document is
 * fixed where it was noticed.
 */
export function RegionalFormatBar({ regional, value, onChange, variant = 'bar' }: RegionalFormatBarProps) {
  const s = useStyles();
  const [open, setOpen] = useState(false);
  const panelId = useId('formats-panel');
  const hasDates = regional.dates.length > 0;
  const hasNumbers = regional.numbers.length > 0;
  if (!hasDates && !hasNumbers) return null;

  const date = DATE_STYLE_EXAMPLES[value.date];
  const number = numberStyleExample(value.number);
  const summary = hasDates && hasNumbers
    ? t('data.formats.bar.both', { date, number })
    : hasDates ? t('data.formats.bar.dates', { date }) : t('data.formats.bar.numbers', { number });

  return (
    <div className={mergeClasses(s.root, variant === 'card' ? s.card : s.bar)}
      data-testid={variant === 'card' ? 'regional-format-card' : 'regional-format-bar'}>
      <div className={mergeClasses(s.line, variant === 'card' && s.lineCard)}>
        <span className={mergeClasses(s.text, variant === 'card' && s.textCard)} role="status">{summary}</span>
        <button type="button" className={s.toggle} aria-expanded={open} aria-controls={panelId}
          aria-label={open ? undefined : t('data.formats.bar.changeLabel')} onClick={() => setOpen((o) => !o)}>
          {open ? t('data.formats.bar.done') : t('data.formats.bar.change')}
        </button>
      </div>
      {open && (
        <div id={panelId} className={s.panel}>
          <RegionalFormatChoice regional={regional} value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
