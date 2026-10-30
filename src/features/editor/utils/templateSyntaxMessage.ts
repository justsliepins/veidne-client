import { t } from '@/i18n/i18n';
import type { TemplateErrorInfo } from '@/features/generator/utils/documentGenerator';

function partName(file: string): string {
  if (/^word\/document\.xml$/.test(file)) return t('error.template.part.body');
  if (/^word\/header\d*\.xml$/.test(file)) return t('error.template.part.header');
  if (/^word\/footer\d*\.xml$/.test(file)) return t('error.template.part.footer');
  if (/^word\/footnotes\.xml$/.test(file)) return t('error.template.part.footnotes');
  if (/^word\/endnotes\.xml$/.test(file)) return t('error.template.part.endnotes');
  return file || t('error.template.part.unknown');
}

/** The refusal shown when an uploaded template will not compile: what Veidne
 *  cannot use, the library's own explanation with the part it was found in,
 *  and what to remove. */
export function templateSyntaxMessage(info: TemplateErrorInfo): string {
  const parts = [t('error.template.syntax')];
  if (info.explanation) parts.push(t('error.template.syntax.detail', { explanation: info.explanation, part: partName(info.file) }));
  parts.push(info.tag ? t('error.template.syntax.fixTag', { tag: info.tag }) : t('error.template.syntax.fix'));
  return parts.join(' ');
}
