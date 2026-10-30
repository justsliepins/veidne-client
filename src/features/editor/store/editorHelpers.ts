import type { WordToken, SelectionState, EditorSnapshot, Placeholder } from '../utils/types';

const MAX_HISTORY = 50;

function stripEdgePunct(s: string): string {
  return s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function findAllOccurrences(tokens: WordToken[], selectedIds: string[]): string[][] {
  const selected = selectedIds.map(id => tokens.find(t => t.id === id)!);
  // Empty-paragraph fillers are structure, not content: they neither form
  // part of the phrase nor break a match, like the spaces between words.
  const pattern = selected
    .filter(t => t.type === 'word' && !t.isEmptyParagraphFiller)
    .map(t => stripEdgePunct(t.text));
  if (!pattern.length || pattern.some(p => !p)) return [selectedIds];

  const wordTokens = tokens.filter(t => t.type === 'word' && !t.isEmptyParagraphFiller);
  const results: string[][] = [];
  for (let i = 0; i <= wordTokens.length - pattern.length; i++) {
    if (pattern.every((text, j) => stripEdgePunct(wordTokens[i + j].text) === text)) {
      const first = tokens.indexOf(wordTokens[i]);
      const last = tokens.indexOf(wordTokens[i + pattern.length - 1]);
      results.push(tokens.slice(first, last + 1).map(t => t.id));
    }
  }
  return results.length ? results : [selectedIds];
}

export function getTokenRange(tokens: WordToken[], fromId: string, toId: string): string[] {
  const a = tokens.findIndex(t => t.id === fromId);
  const b = tokens.findIndex(t => t.id === toId);
  return tokens.slice(Math.min(a, b), Math.max(a, b) + 1).map(t => t.id);
}

export function getSelectedText(tokens: WordToken[], tokenIds: string[]): string {
  const ids = new Set(tokenIds);
  // Empty-paragraph fillers contribute zero text: their synthetic NBSP is
  // display-only and exists nowhere in the document XML.
  const raw = tokens
    .filter(t => ids.has(t.id) && !t.isEmptyParagraphFiller)
    .map(t => t.text).join('');
  return raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function snap(h: EditorSnapshot[], idx: number, p: Placeholder[]) {
  const next = [...h.slice(0, idx + 1), { placeholders: structuredClone(p) }];
  if (next.length > MAX_HISTORY) next.shift();
  return { history: next, historyIndex: next.length - 1 };
}

export const idle = { selectionState: 'idle' as SelectionState, firstClickTokenId: null, selectedTokenIds: [] as string[] };

/** The part of a claimed token's text that lies outside its {{...}} match.
 *  Tokens split on whitespace only, so punctuation glued to the braces
 *  ("{{NAME}}," or "({{NAME}})") lives in the same token as the match. */
export interface TokenCoverage {
  prefix: string;
  suffix: string;
}

interface PlaceholderMatch {
  name: string;
  claims: { token: WordToken; prefix: string; suffix: string }[];
}

/** {{#each}}, {{/each}}, {{^empty}}, {{> partial}}: control tags, never fields. */
const CONTROL_TAG = /^[#/^>]/;

function scanPlaceholderMatches(tokens: WordToken[]): PlaceholderMatch[] {
  const paragraphs = new Map<number, WordToken[]>();
  for (const token of tokens) {
    if (!paragraphs.has(token.paragraphIndex)) paragraphs.set(token.paragraphIndex, []);
    paragraphs.get(token.paragraphIndex)!.push(token);
  }

  const found: PlaceholderMatch[] = [];

  for (const [, paraTokens] of paragraphs) {
    const positions: { start: number; end: number; token: WordToken }[] = [];
    let pos = 0;
    for (const token of paraTokens) {
      positions.push({ start: pos, end: pos + token.text.length, token });
      pos += token.text.length;
    }

    const fullText = paraTokens.map(t => t.text).join('');
    const re = /\{\{([^{}]+)\}\}/g;
    let match;

    while ((match = re.exec(fullText)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      const name = match[1].trim();
      if (!name) continue;
      // Handlebars control structures from another tool's template are not
      // merge fields. Left alone they become literal text in the output.
      if (CONTROL_TAG.test(name)) continue;

      const claims: PlaceholderMatch['claims'] = [];
      for (const { start, end, token } of positions) {
        if (start < matchEnd && end > matchStart) {
          claims.push({
            token,
            prefix: token.text.slice(0, Math.max(0, matchStart - start)),
            suffix: token.text.slice(Math.min(token.text.length, matchEnd - start)),
          });
        }
      }
      if (claims.length > 0) found.push({ name, claims });
    }
  }

  return found;
}

/** Per-token uncovered text for every token claimed by a {{...}} match, keyed by
 *  token id. Preview renderers emit this around the merged value so characters
 *  glued to the braces survive the merge. */
export function computePlaceholderCoverage(tokens: WordToken[]): Map<string, TokenCoverage> {
  const coverage = new Map<string, TokenCoverage>();
  for (const { claims } of scanPlaceholderMatches(tokens)) {
    for (const { token, prefix, suffix } of claims) {
      coverage.set(token.id, { prefix, suffix });
    }
  }
  return coverage;
}

export function detectTemplatePlaceholders(tokens: WordToken[]): Placeholder[] {
  const found = scanPlaceholderMatches(tokens).map(({ name, claims }) => ({
    name,
    tokenIds: claims.map(c => c.token.id),
  }));

  const groups = new Map<string, string[][]>();
  for (const { name, tokenIds } of found) {
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(tokenIds);
  }

  const placeholders: Placeholder[] = [];
  let colorIndex = 0;
  for (const [name, occurrences] of groups) {
    placeholders.push({ id: `ph-${Date.now()}-${colorIndex}`, name, originalText: `{{${name}}}`, colorIndex, occurrences });
    colorIndex++;
  }

  return placeholders;
}
