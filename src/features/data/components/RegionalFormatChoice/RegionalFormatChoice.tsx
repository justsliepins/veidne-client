import { Radio, RadioGroup, mergeClasses, useId } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import type { RegionalColumns } from '../../utils/excelParser';
import {
  DATE_STYLES,
  DATE_STYLE_EXAMPLES,
  NUMBER_STYLES,
  numberStyleExample,
  type DateStyle,
  type FormatConventions,
  type NumberStyle,
} from '../../utils/localeFormats';
import { useStyles } from './RegionalFormatChoice.styles';

interface RegionalFormatChoiceProps {
  regional: RegionalColumns;
  value: FormatConventions;
  onChange: (next: Partial<FormatConventions>) => void;
  /** Placement (margins) from the parent: the mapping dialog or the preview. */
  className?: string;
}

const MAX_NAMED = 3;

/** "Date, Due date, Amount and 2 more": the columns the choice applies to. */
function columnList(names: string[]): string {
  const shown = names.slice(0, MAX_NAMED).join(', ');
  const rest = names.length - MAX_NAMED;
  return rest > 0 ? `${shown} ${tCount(rest, 'data.formats.more')}` : shown;
}

/**
 * The date and number style of the user's Excel (audit nov 2026, finding 2).
 * Shown only when some column depends on it; a group only for the kind
 * present. Every option shows 14 November 2026 or 1 234,50 in that style,
 * exactly as the documents will get it.
 */
export function RegionalFormatChoice({ regional, value, onChange, className }: RegionalFormatChoiceProps) {
  const s = useStyles();
  const datesId = useId('formats-dates');
  const numbersId = useId('formats-numbers');
  const hasDates = regional.dates.length > 0;
  const hasNumbers = regional.numbers.length > 0;
  if (!hasDates && !hasNumbers) return null;
  const columns = columnList([...new Set([...regional.dates, ...regional.numbers])]);

  return (
    <div className={mergeClasses(s.root, className)}>
      <div className={s.title}>{t('data.formats.title')}</div>
      <div className={s.text}>{t('data.formats.text', { columns })}</div>
      {hasDates && (
        <div className={s.group}>
          <span id={datesId} className={s.label}>{t('data.formats.dates')}</span>
          <RadioGroup aria-labelledby={datesId} layout="horizontal" className={s.options}
            value={value.date} onChange={(_, d) => onChange({ date: d.value as DateStyle })}>
            {DATE_STYLES.map((style) => (
              <Radio key={style} value={style} className={s.option} label={
                style === 'dmy-dot-end'
                  ? <>{DATE_STYLE_EXAMPLES[style]}<span className={s.srOnly}> {t('data.formats.dotAfterYear')}</span></>
                  : DATE_STYLE_EXAMPLES[style]
              } />
            ))}
          </RadioGroup>
        </div>
      )}
      {hasNumbers && (
        <div className={s.group}>
          <span id={numbersId} className={s.label}>{t('data.formats.numbers')}</span>
          <RadioGroup aria-labelledby={numbersId} layout="horizontal" className={s.options}
            value={value.number} onChange={(_, d) => onChange({ number: d.value as NumberStyle })}>
            {NUMBER_STYLES.map((style) => (
              <Radio key={style} value={style} className={s.option} label={numberStyleExample(style)} />
            ))}
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
