import { create } from 'zustand';
import { createTaggedTemplate } from '../utils/documentTagger';
import { generateDocument } from '../utils/documentGenerator';
import { transcodeImageFiles } from '../utils/imageTranscoder';
import type { ImageFieldSwap } from '../utils/imageSwap';
import { matchImageField } from '@/features/data/utils/imageMatch';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { features } from '@/config/features';
import { buildFileName } from '../utils/fileNaming';
import { triggerDownload, createZipFromFiles } from '../utils/downloadHelpers';
import { useDataStore } from '@/features/data/store/dataStore';
import type { Placeholder } from '@/features/editor/utils/types';

export interface GeneratedFile { name: string; stem: string; blob: Blob }

interface GeneratorState {
  isGenerating: boolean; progress: number; currentRow: number;
  totalRows: number; generatedFiles: GeneratedFile[]; cancelled: boolean;
  baseName: string;
  generate: (rawDocxBytes: ArrayBuffer, placeholders: Placeholder[], rows: Record<string, string>[],
    columnMapping: Record<string, string>, originalFileName: string) => Promise<void>;
  downloadFile: (index: number) => void;
  downloadAll: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

const initial = {
  isGenerating: false, progress: 0, currentRow: 0,
  totalRows: 0, generatedFiles: [] as GeneratedFile[], cancelled: false, baseName: '',
};

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  ...initial,

  generate: async (rawDocxBytes, placeholders, rows, columnMapping, originalFileName) => {
    // One run at a time. The progress overlay normally keeps a second click
    // out, but the store must not depend on the UI for that.
    if (get().isGenerating) return;
    const baseName = originalFileName.replace(/\.docx$/i, '') || 'documents';
    set({ isGenerating: true, progress: 0, currentRow: 0, totalRows: rows.length, generatedFiles: [], cancelled: false, baseName });
    useDataStore.getState().setPhase('generating');
    try {
      const taggedBytes = createTaggedTemplate(rawDocxBytes, placeholders, useEditorStore.getState().wordTokens);
      const namingConfig = useDataStore.getState().namingConfig;
      const usedNames = new Set<string>();

      // Image fields (dark-launched): transcode each unique matched file once
      // BEFORE the row loop, then hand every row its swap plan.
      let rowSwaps: ImageFieldSwap[][] | null = null;
      const imageFields = placeholders.filter(p => p.type === 'image');
      if (features.imagePlaceholders && imageFields.length > 0) {
        const ds = useDataStore.getState();
        const matches = imageFields.map(f =>
          matchImageField(f.name, columnMapping, rows, ds.imageFiles.keys(), ds.imageResolutions));

        // Largest sample box longest-side (px at 96/inch) per file, from the
        // template's own drawing extents.
        const tokens = useEditorStore.getState().wordTokens;
        const boxLongestPx = (name: string) => {
          const tok = tokens.find(t => t.type === 'image' && t.imageDescr === `{{${name}}}`);
          const longest = Math.max(tok?.imageEmuW ?? 0, tok?.imageEmuH ?? 0) / 9525;
          return longest > 0 ? longest : 800;
        };
        const needed = new Map<string, number>();
        matches.forEach((m, fi) => {
          const box = boxLongestPx(imageFields[fi].name);
          for (const r of m.rows) {
            if (r.file) needed.set(r.file, Math.max(needed.get(r.file) ?? 0, box));
          }
        });
        const transcoded = await transcodeImageFiles(ds.imageFiles, needed);

        rowSwaps = rows.map((_, i) => imageFields.map((f, fi) => ({
          tag: `{{${f.name}}}`,
          image: matches[fi].rows[i].file ? transcoded.get(matches[fi].rows[i].file!) ?? null : null,
        })));
      }

      for (let i = 0; i < rows.length; i++) {
        if (get().cancelled) break;
        const blob = generateDocument(taggedBytes, rows[i], columnMapping, placeholders, rowSwaps?.[i]);
        const name = buildFileName(namingConfig, rows[i], columnMapping, placeholders, usedNames);
        // Keep the deduped stem (name minus .docx) alongside the blob so the PDF
        // path can reuse the exact Word counterpart name (ruling 6). The Word path
        // is otherwise untouched.
        const stem = name.replace(/\.docx$/i, '');
        set(s => ({ currentRow: i + 1, progress: (i + 1) / rows.length, generatedFiles: [...s.generatedFiles, { name, stem, blob }] }));
        await new Promise(r => setTimeout(r, 0));
      }
      set({ isGenerating: false });
      if (!get().cancelled) useDataStore.getState().setPhase('done');
    } catch (e) {
      set({ isGenerating: false });
      useDataStore.getState().setPhase('preview');
      throw e;
    }
  },

  downloadFile: (index) => {
    const file = get().generatedFiles[index];
    if (file) triggerDownload(file.blob, file.name);
  },

  downloadAll: async () => {
    const { generatedFiles, baseName } = get();
    if (!generatedFiles.length) return;
    const zip = await createZipFromFiles(generatedFiles);
    triggerDownload(zip, `${baseName || 'documents'}.zip`);
  },

  cancel: () => {
    set({ cancelled: true });
    useDataStore.getState().setPhase('preview');
  },

  reset: () => set(initial),
}));
