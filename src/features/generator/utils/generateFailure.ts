import type { Placeholder } from '@/features/editor/utils/types';
import { describeTemplateError } from './documentGenerator';

/** Why a Generate run failed, as far as the client can tell. */
export type GenerateFailure =
  /** A text field whose name starts with a character the template engine
   *  reads as a command ({{#Name}} opens a loop, {{/Name}} closes one,
   *  {{^Name}} inverts one, {{@Name}} inserts raw XML). */
  | { kind: 'fieldName'; name: string; char: string }
  /** The template engine named the problem and the part it was found in. */
  | { kind: 'template'; explanation: string; file: string }
  | { kind: 'unknown' };

const COMMAND_PREFIX = /^[#/^@]/;

export function describeGenerateFailure(e: unknown, placeholders: Placeholder[]): GenerateFailure {
  const info = describeTemplateError(e);
  if (!info) return { kind: 'unknown' };
  // The engine reports the tag without its command character ("Name" for
  // {{#Name}}), so match on the rest of the field name.
  const field = placeholders.find((p) => p.type !== 'image' && COMMAND_PREFIX.test(p.name)
    && (!info.tag || p.name.slice(1).trim() === info.tag));
  if (field) return { kind: 'fieldName', name: field.name, char: field.name[0] };
  if (info.explanation) return { kind: 'template', explanation: info.explanation, file: info.file };
  return { kind: 'unknown' };
}
