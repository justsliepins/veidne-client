import { create } from 'zustand';
import PizZip from 'pizzip';
import { parseDocxDirect } from '../utils/docxDirectParser';
import { normalizeFieldsInDocx } from '../utils/normalizeFields';
import { setImageFieldTag, clearImageFieldTagsByName, imageFieldNameFromDescr } from '../utils/imageFieldXml';
import { useDataStore } from '@/features/data/store/dataStore';
import type { WordToken, Placeholder, SelectionState, EditorSnapshot, PageLayout, ParagraphStyle } from '../utils/types';
import { findAllOccurrences, getTokenRange, getSelectedText, snap, idle, detectTemplatePlaceholders } from './editorHelpers';
import { createTaggedTemplate } from '@/features/generator/utils/documentTagger';
import { checkTemplateCompiles, TemplateSyntaxError } from '@/features/generator/utils/documentGenerator';

interface EditorState {
  rawDocxBytes: ArrayBuffer | null; fileName: string | null;
  htmlContent: string | null; wordTokens: WordToken[];
  pageLayout: PageLayout | null; paragraphStyles: Record<number, ParagraphStyle>;
  placeholders: Placeholder[]; selectedPlaceholderId: string | null;
  selectionState: SelectionState; firstClickTokenId: string | null;
  selectedTokenIds: string[]; hoveredTokenId: string | null;
  history: EditorSnapshot[]; historyIndex: number;
  lastActionResult: { type: 'created' | 'deleted' | 'renamed'; name: string; originalText: string; occurrenceCount: number; fieldKind?: 'text' | 'image' } | null;
  loadDocument: (file: File) => Promise<void>;
  restoreSession: (rawBytes: ArrayBuffer, fileName: string, savedPlaceholders: unknown[]) => Promise<void>;
  clickWord: (tokenId: string) => void; hoverWord: (tokenId: string) => void;
  extendSelectionTo: (tokenId: string) => void;
  clearHover: () => void; cancelSelection: () => void;
  createPlaceholder: (name: string) => void; renamePlaceholder: (id: string, newName: string) => void;
  deletePlaceholder: (id: string) => void; selectPlaceholder: (id: string | null) => void;
  createImageField: (tokenId: string, name: string) => void;
  removeImageFieldTag: (tokenId: string) => void;
  clearLastAction: () => void; undo: () => void; redo: () => void;
  reset: () => void;
}

/** Release the object URLs held by image tokens when their document goes away
 *  (replaced upload, restored session, reset). */
function revokeImageUrls(tokens: WordToken[]): void {
  for (const t of tokens) {
    if (t.type === 'image' && t.text.startsWith('blob:')) URL.revokeObjectURL(t.text);
  }
}

/** Round trip: drawings whose alt text reads {{NAME}} become image fields on
 *  load, so a downloaded tagged template re-uploads like a text template, and
 *  pre-tagging in Word (typing {{PHOTO}} into a picture's alt text) works
 *  with no Veidne UI at all. Same-name drawings share one field. */
function detectImageFields(tokens: WordToken[], startColor: number): Placeholder[] {
  const groups = new Map<string, string[][]>();
  for (const t of tokens) {
    if (t.type !== 'image') continue;
    const name = imageFieldNameFromDescr(t.imageDescr);
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push([t.id]);
  }
  let colorIndex = startColor;
  return [...groups.entries()].map(([name, occurrences]) => ({
    id: `ph-img-${Date.now()}-${colorIndex}`,
    name, originalText: '', colorIndex: colorIndex++, occurrences, type: 'image' as const,
  }));
}

/** Image-field occurrences in a token list: one per drawing tagged {{name}}. */
function imageOccurrences(tokens: WordToken[], name: string): string[][] {
  const tag = `{{${name}}}`;
  return tokens.filter(t => t.type === 'image' && t.imageDescr === tag).map(t => [t.id]);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  rawDocxBytes: null, fileName: null, htmlContent: null, wordTokens: [],
  pageLayout: null, paragraphStyles: {},
  placeholders: [], selectedPlaceholderId: null,
  selectionState: 'idle', firstClickTokenId: null, selectedTokenIds: [], hoveredTokenId: null,
  history: [{ placeholders: [] }], historyIndex: 0, lastActionResult: null,

  loadDocument: async (file) => {
    const buf = await file.arrayBuffer();
    const zip = new PizZip(buf);
    normalizeFieldsInDocx(zip);
    const normalizedBytes = zip.generate({ type: 'arraybuffer' }) as ArrayBuffer;
    const { tokens, pageLayout, paragraphStyles } = parseDocxDirect(normalizedBytes);
    const detected = detectTemplatePlaceholders(tokens);
    detected.push(...detectImageFields(tokens, detected.length));
    // Compile once, exactly as generation will, so a template docxtemplater
    // rejects (a mismatched {{#a}}...{{/b}} pair in a header, for instance)
    // is refused here with the reason, not at Generate with a generic toast.
    const problem = checkTemplateCompiles(createTaggedTemplate(normalizedBytes, detected, tokens), detected);
    if (problem) {
      revokeImageUrls(tokens);
      throw new TemplateSyntaxError(problem);
    }
    revokeImageUrls(get().wordTokens);
    set({ rawDocxBytes: normalizedBytes, fileName: file.name, htmlContent: null, wordTokens: tokens,
      pageLayout, paragraphStyles,
      placeholders: detected, selectedPlaceholderId: null, hoveredTokenId: null,
      history: [{ placeholders: structuredClone(detected) }], historyIndex: 0, lastActionResult: null, ...idle });
  },

  restoreSession: async (rawBytes, fileName, savedPlaceholders) => {
    revokeImageUrls(get().wordTokens);
    const { tokens, pageLayout, paragraphStyles } = parseDocxDirect(rawBytes);
    // Sessions saved before the image type carry no type field: text.
    const phs = (savedPlaceholders as Placeholder[]).map(p => ({
      ...p, type: p.type === 'image' ? 'image' as const : 'text' as const,
    }));
    set({ rawDocxBytes: rawBytes, fileName, htmlContent: null, wordTokens: tokens,
      pageLayout, paragraphStyles,
      placeholders: phs, selectedPlaceholderId: null, hoveredTokenId: null,
      history: [{ placeholders: structuredClone(phs) }], historyIndex: 0, lastActionResult: null, ...idle });
  },

  clickWord: (tokenId) => {
    const { selectionState, firstClickTokenId, wordTokens } = get();
    if (selectionState === 'idle' || selectionState === 'rangeSelected')
      set({ selectionState: 'oneWord', firstClickTokenId: tokenId, selectedTokenIds: [tokenId] });
    else if (firstClickTokenId)
      set({ selectionState: 'rangeSelected', selectedTokenIds: getTokenRange(wordTokens, firstClickTokenId, tokenId) });
  },

  // Keyboard range growth: keep the anchor (firstClickTokenId) fixed and
  // recompute the run out to the new endpoint. Shift+arrow calls this after
  // moving focus; unlike clickWord it never re-anchors, so repeated presses
  // grow and shrink one continuous selection.
  extendSelectionTo: (tokenId) => {
    const { firstClickTokenId, wordTokens } = get();
    if (!firstClickTokenId) return;
    const range = getTokenRange(wordTokens, firstClickTokenId, tokenId);
    set({ selectionState: range.length > 1 ? 'rangeSelected' : 'oneWord', selectedTokenIds: range });
  },

  hoverWord: (tokenId) => set({ hoveredTokenId: tokenId }),
  clearHover: () => set({ hoveredTokenId: null }),
  cancelSelection: () => set(idle),
  selectPlaceholder: (id) => set({ selectedPlaceholderId: id }),
  clearLastAction: () => set({ lastActionResult: null }),

  createPlaceholder: (name) => {
    const { wordTokens, placeholders, selectedTokenIds, history, historyIndex } = get();
    const originalText = getSelectedText(wordTokens, selectedTokenIds);
    const occurrences = findAllOccurrences(wordTokens, selectedTokenIds);

    // Re-using an existing field's name merges the selection into that field
    // (the popover asks the user first): the new ranges become additional
    // occurrences, so every location fills with the same value. The field's
    // id/color/name stay put, and ranges it already owns are not added twice.
    const existing = placeholders.find(p => p.type !== 'image' && p.name === name);
    if (existing) {
      const seen = new Set(existing.occurrences.map(o => o.join('|')));
      const fresh = occurrences.filter(o => !seen.has(o.join('|')));
      const merged = { ...existing, occurrences: [...existing.occurrences, ...fresh] };
      const next = placeholders.map(p => (p === existing ? merged : p));
      set({ placeholders: next, ...snap(history, historyIndex, next), ...idle,
        lastActionResult: { type: 'created', name, originalText, occurrenceCount: merged.occurrences.length, fieldKind: 'text' } });
      return;
    }

    const ph: Placeholder = { id: `ph-${Date.now()}`, name, originalText, colorIndex: placeholders.length, occurrences };
    const next = [...placeholders, ph];
    set({ placeholders: next, ...snap(history, historyIndex, next), ...idle,
      lastActionResult: { type: 'created', name, originalText, occurrenceCount: occurrences.length, fieldKind: 'text' } });
  },

  renamePlaceholder: (id, newName) => {
    const { placeholders, history, historyIndex } = get();
    const old = placeholders.find(p => p.id === id);
    const next = placeholders.map(p => p.id === id ? { ...p, name: newName } : p);
    set({ placeholders: next, ...snap(history, historyIndex, next),
      lastActionResult: { type: 'renamed', name: newName, originalText: old?.originalText ?? '', occurrenceCount: 0 } });
  },

  deletePlaceholder: (id) => {
    const { placeholders, history, historyIndex, rawDocxBytes, wordTokens } = get();
    const old = placeholders.find(p => p.id === id);
    const next = placeholders.filter(p => p.id !== id);

    // Image fields live as alt-text tags in the XML; deleting the field must
    // clear those tags too, or a re-upload would resurrect it.
    if (old?.type === 'image' && rawDocxBytes) {
      const newBytes = clearImageFieldTagsByName(rawDocxBytes, old.name);
      revokeImageUrls(wordTokens);
      const { tokens, pageLayout, paragraphStyles } = parseDocxDirect(newBytes);
      set({ rawDocxBytes: newBytes, wordTokens: tokens, pageLayout, paragraphStyles,
        placeholders: next, selectedPlaceholderId: null, ...snap(history, historyIndex, next),
        lastActionResult: { type: 'deleted', name: old.name, originalText: '', occurrenceCount: 0 } });
      return;
    }

    set({ placeholders: next, selectedPlaceholderId: null, ...snap(history, historyIndex, next),
      lastActionResult: { type: 'deleted', name: old?.name ?? '', originalText: old?.originalText ?? '', occurrenceCount: 0 } });
  },

  createImageField: (tokenId, name) => {
    const { wordTokens, rawDocxBytes, placeholders, history, historyIndex } = get();
    const token = wordTokens.find(t => t.id === tokenId);
    if (!token || token.type !== 'image' || token.imageDocIndex === undefined || !rawDocxBytes) return;

    const newBytes = setImageFieldTag(rawDocxBytes, token.imageDocIndex, name);
    revokeImageUrls(wordTokens);
    const { tokens, pageLayout, paragraphStyles } = parseDocxDirect(newBytes);
    const occurrences = imageOccurrences(tokens, name);

    const existing = placeholders.find(p => p.type === 'image' && p.name === name);
    const next = existing
      ? placeholders.map(p => (p === existing ? { ...p, occurrences } : p))
      : [...placeholders, {
          id: `ph-img-${Date.now()}`, name, originalText: '',
          colorIndex: placeholders.length, occurrences, type: 'image' as const,
        }];

    set({ rawDocxBytes: newBytes, wordTokens: tokens, pageLayout, paragraphStyles,
      placeholders: next, ...snap(history, historyIndex, next), ...idle,
      lastActionResult: { type: 'created', name, originalText: '', occurrenceCount: occurrences.length, fieldKind: 'image' } });
    useDataStore.getState().mapNewField(name);
    useDataStore.getState().maybeRouteToPictures();
  },

  removeImageFieldTag: (tokenId) => {
    const { wordTokens, rawDocxBytes, placeholders, history, historyIndex } = get();
    const token = wordTokens.find(t => t.id === tokenId);
    const name = imageFieldNameFromDescr(token?.imageDescr);
    if (!token || token.imageDocIndex === undefined || !rawDocxBytes || !name) return;

    const newBytes = setImageFieldTag(rawDocxBytes, token.imageDocIndex, null);
    revokeImageUrls(wordTokens);
    const { tokens, pageLayout, paragraphStyles } = parseDocxDirect(newBytes);
    const occurrences = imageOccurrences(tokens, name);

    // Other drawings may still carry the tag; the field only goes when the
    // last one is cleared.
    const next = occurrences.length > 0
      ? placeholders.map(p => (p.type === 'image' && p.name === name ? { ...p, occurrences } : p))
      : placeholders.filter(p => !(p.type === 'image' && p.name === name));

    set({ rawDocxBytes: newBytes, wordTokens: tokens, pageLayout, paragraphStyles,
      placeholders: next, ...snap(history, historyIndex, next),
      lastActionResult: { type: 'deleted', name, originalText: '', occurrenceCount: 0 } });
  },

  undo: () => { const { history: h, historyIndex: i } = get(); if (i > 0) set({ placeholders: structuredClone(h[i - 1].placeholders), historyIndex: i - 1 }); },
  redo: () => { const { history: h, historyIndex: i } = get(); if (i < h.length - 1) set({ placeholders: structuredClone(h[i + 1].placeholders), historyIndex: i + 1 }); },
  reset: () => { revokeImageUrls(get().wordTokens); set({ rawDocxBytes: null, fileName: null, htmlContent: null, wordTokens: [],
    pageLayout: null, paragraphStyles: {},
    placeholders: [], selectedPlaceholderId: null, hoveredTokenId: null,
    history: [{ placeholders: [] }], historyIndex: 0, lastActionResult: null, ...idle }); },
}));
