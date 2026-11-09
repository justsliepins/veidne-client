import { t } from '@/i18n/i18n';
import type { ControlFinding } from './placeholderDetector';

/** The control tags as the user would recognise them in their document:
 *  typed tags as written ({{#each rows}}), Word fields by keyword. Unique,
 *  in document order, the first six named. */
export function describeControlTags(controls: ControlFinding[]): string {
  const labels = [...new Set(controls.map((c) => (c.family === 'wordField'
    ? t('import.controls.wordField', { tag: c.tag })
    : c.raw)))];
  const shown = labels.slice(0, 6).join(', ');
  return labels.length > 6 ? t('import.controls.more', { list: shown, count: String(labels.length - 6) }) : shown;
}
