import { t } from '@/i18n/i18n';

/** The coverage line for the pictures panel and the rail summary. Exact copy
 *  per the checklist: singular rows get their own phrasing, full coverage
 *  reads as a statement, partial coverage as a fraction. */
export function coverageLine(matched: number, total: number): string {
  if (total === 1) {
    return matched === 1 ? t('imageIntake.coverage.singleHas') : t('imageIntake.coverage.singleNone');
  }
  if (matched === total) {
    return t('imageIntake.coverage.all', { count: String(total) });
  }
  return t('imageIntake.summary', { matched: String(matched), total: String(total) });
}
