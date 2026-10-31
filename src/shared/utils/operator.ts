import { t } from '@/i18n/i18n';

/** The operator's identity and contact address, filled in once in en.json
 *  (legal.operator.*, legal.contactEmail) and used by the footer line, the
 *  privacy notice and the accessibility page. */
export function operatorParams(): Record<string, string> {
  return {
    name: t('legal.operator.name'),
    regNo: t('legal.operator.regNo'),
    address: t('legal.operator.address'),
    email: t('legal.contactEmail'),
  };
}
