import { create } from 'zustand';
import { parseExcel } from '../utils/excelParser';
import { fuzzyMatchColumns, normalizeForMatch } from '../utils/fuzzyMatch';
import type { FuzzyMatchResult } from '../utils/fuzzyMatch';
import { mappedFields, type NamingConfig } from '@/features/generator/utils/fileNaming';
import { useEditorStore } from '@/features/editor/store/editorStore';

export type EditorPhase = 'upload' | 'placeholders' | 'excelUpload' | 'mapping' | 'preview' | 'generating' | 'done';
export type DataSubState = 'bridge' | 'kit' | 'upload' | 'mapping' | 'preview' | 'matchData' | 'pictures';

interface DataState {
  rawXlsxBytes: ArrayBuffer | null; fileName: string | null;
  columns: string[]; rows: Record<string, string>[];
  columnMapping: Record<string, string>; matchResult: FuzzyMatchResult | null;
  currentPreviewRow: number; editorPhase: EditorPhase;
  dataTransitionBeat: number; dataSubState: DataSubState; kitDownloaded: boolean;
  /** True while the rows are the synthesized sample set (instant preview or
   *  guided demo), so generations can be flagged in analytics. */
  isSampleData: boolean;
  namingConfig: NamingConfig;
  /** Dropped picture files for image fields, keyed by bare file name. */
  imageFiles: Map<string, Blob>;
  /** Manual per-row overrides: "<field> <rowIdx>" to a file name, or '' for
   *  "generate this row without a picture". */
  imageResolutions: Record<string, string>;
  addImageFiles: (files: { name: string; blob: Blob }[]) => void;
  /** The guided Pictures step fired already this session (fire once: a user
   *  who continued without pictures is not auto-routed again). */
  picturesPromptShown: boolean;
  maybeRouteToPictures: () => void;
  continuePictures: () => void;
  setImageResolution: (field: string, rowIndex: number, fileName: string) => void;
  mapNewField: (fieldName: string) => void;
  setNamingConfig: (partial: Partial<NamingConfig>) => void;
  loadExcel: (file: File) => Promise<void>;
  applyMapping: (mapping: Record<string, string>) => void;
  cancelMapping: () => void;
  setPreviewRow: (index: number) => void;
  nextRow: () => void; prevRow: () => void;
  replaceExcel: (file: File) => Promise<void>;
  setPhase: (phase: EditorPhase) => void;
  setDataSubState: (sub: DataSubState) => void;
  getFilledValue: (placeholderName: string) => string;
  matchWithLoadedTemplate: () => void;
  setKitDownloaded: (v: boolean) => void;
  dismissInfoBar: () => void;
  reset: () => void;
}

const initial = {
  rawXlsxBytes: null, fileName: null, columns: [] as string[], rows: [] as Record<string, string>[],
  columnMapping: {} as Record<string, string>, matchResult: null as FuzzyMatchResult | null,
  currentPreviewRow: 0, editorPhase: 'upload' as EditorPhase, dataTransitionBeat: 0, dataSubState: 'bridge' as DataSubState, kitDownloaded: false,
  isSampleData: false,
  namingConfig: { field: '', dupeMode: 'number', secondField: null } as NamingConfig,
  imageResolutions: {} as Record<string, string>,
  picturesPromptShown: false,
};

/** Default naming config for a freshly applied mapping: name by the first mapped field. */
function defaultNamingConfig(mapping: Record<string, string>): NamingConfig {
  const placeholders = useEditorStore.getState().placeholders;
  return { field: mappedFields(mapping, placeholders)[0] ?? '', prefix: undefined, secondField: null, dupeMode: 'number' };
}

let beatTimer: ReturnType<typeof setTimeout> | null = null;
function clearBeatTimer() { if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; } }

function scheduleBeat(set: (s: Partial<DataState>) => void, beat: number, delay: number) {
  beatTimer = setTimeout(() => {
    set({ dataTransitionBeat: beat });
    if (beat < 4) scheduleBeat(set, beat + 1, 800);
    else beatTimer = null;
  }, delay);
}

async function parseFile(file: File) {
  const buf = await file.arrayBuffer();
  const { columns, rows } = parseExcel(buf);
  const phNames = useEditorStore.getState().placeholders.map(p => p.name);
  const matchResult = fuzzyMatchColumns(columns, phNames);
  const columnMapping: Record<string, string> = {};
  for (const m of matchResult.matched) columnMapping[m.column] = m.placeholder;
  return { rawXlsxBytes: buf, fileName: file.name, columns, rows, matchResult, columnMapping };
}

export const useDataStore = create<DataState>((set, get) => ({
  ...initial,
  imageFiles: new Map<string, Blob>(),

  addImageFiles: (files) => {
    const next = new Map(get().imageFiles);
    for (const f of files) next.set(f.name, f.blob);
    set({ imageFiles: next });
  },

  // Routing into the guided Pictures step happens only on a transition into
  // needsPictures (image fields present, rows present, no files), once per
  // session. Re-entry afterwards is the Data step card and the rail summary.
  maybeRouteToPictures: () => {
    const { rows, imageFiles, picturesPromptShown } = get();
    const hasImageField = useEditorStore.getState().placeholders.some(p => p.type === 'image');
    if (picturesPromptShown || !hasImageField || rows.length === 0 || imageFiles.size > 0) return;
    set({ editorPhase: 'preview', dataSubState: 'pictures', picturesPromptShown: true });
  },

  continuePictures: () => set({ dataSubState: 'preview' }),

  /** A field created after the spreadsheet was mapped (for example tagging a
   *  picture from the preview) still deserves its column: bind the first
   *  unmapped column whose normalized name matches. */
  mapNewField: (fieldName) => {
    const { columns, columnMapping } = get();
    if (Object.values(columnMapping).includes(fieldName)) return;
    const taken = new Set(Object.keys(columnMapping));
    const col = columns.find(c => !taken.has(c) && normalizeForMatch(c) === normalizeForMatch(fieldName));
    if (col) set({ columnMapping: { ...columnMapping, [col]: fieldName } });
  },

  setImageResolution: (field, rowIndex, fileName) => {
    set({ imageResolutions: { ...get().imageResolutions, [`${field} ${rowIndex}`]: fileName } });
  },

  loadExcel: async (file) => {
    const hasPlaceholders = useEditorStore.getState().placeholders.length > 0;
    if (!hasPlaceholders) {
      const buf = await file.arrayBuffer();
      const { columns, rows } = parseExcel(buf);
      set({ rawXlsxBytes: buf, fileName: file.name, columns, rows, matchResult: null, columnMapping: {}, currentPreviewRow: 0, editorPhase: 'excelUpload', dataSubState: 'matchData', isSampleData: false, imageResolutions: {} });
      return;
    }
    const data = await parseFile(file);
    // New rows make old per-row picture choices meaningless.
    set({ ...data, currentPreviewRow: 0, editorPhase: 'mapping', dataSubState: 'mapping', isSampleData: false, imageResolutions: {} });
  },

  replaceExcel: async (file) => {
    const data = await parseFile(file);
    set({ ...data, currentPreviewRow: 0, editorPhase: 'mapping', dataSubState: 'mapping', isSampleData: false, imageResolutions: {} });
  },

  applyMapping: (mapping) => {
    const { rows } = get();
    const mappedCols = Object.keys(mapping);
    const effectiveRows = mappedCols.length > 0
      ? rows.filter(row => mappedCols.some(col => (row[col] ?? '').trim() !== ''))
      : rows;
    clearBeatTimer();
    set({ columnMapping: mapping, rows: effectiveRows, currentPreviewRow: 0, editorPhase: 'preview', dataTransitionBeat: 1, dataSubState: 'preview', namingConfig: defaultNamingConfig(mapping) });
    scheduleBeat(set, 2, 800);
    get().maybeRouteToPictures();
  },

  setNamingConfig: (partial) => set(s => ({ namingConfig: { ...s.namingConfig, ...partial } })),

  cancelMapping: () => {
    clearBeatTimer();
    set({
      rawXlsxBytes: null, fileName: null, columns: [], rows: [],
      columnMapping: {}, matchResult: null, currentPreviewRow: 0, editorPhase: 'placeholders', dataTransitionBeat: 0, dataSubState: 'bridge',
      namingConfig: { field: '', dupeMode: 'number', secondField: null },
    });
  },

  setPreviewRow: (index) => {
    const len = get().rows.length;
    set({ currentPreviewRow: Math.max(0, Math.min(index, len - 1)) });
  },

  nextRow: () => { const { currentPreviewRow, rows } = get(); if (currentPreviewRow < rows.length - 1) set({ currentPreviewRow: currentPreviewRow + 1 }); },
  prevRow: () => { const { currentPreviewRow } = get(); if (currentPreviewRow > 0) set({ currentPreviewRow: currentPreviewRow - 1 }); },

  setPhase: (phase) => {
    if (phase !== 'preview') {
      clearBeatTimer();
      const sub = phase === 'excelUpload' ? 'bridge' as DataSubState : get().dataSubState;
      set({ editorPhase: phase, dataTransitionBeat: 0, dataSubState: sub });
    } else set({ editorPhase: phase });
  },

  setDataSubState: (sub) => set({ dataSubState: sub }),

  matchWithLoadedTemplate: () => {
    const { columns } = get();
    const phNames = useEditorStore.getState().placeholders.map(p => p.name);
    const matchResult = fuzzyMatchColumns(columns, phNames);
    const columnMapping: Record<string, string> = {};
    for (const m of matchResult.matched) columnMapping[m.column] = m.placeholder;
    set({ matchResult, columnMapping, editorPhase: 'mapping', dataSubState: 'mapping' });
  },

  setKitDownloaded: (v) => set({ kitDownloaded: v }),

  getFilledValue: (placeholderName) => {
    const { columnMapping, rows, currentPreviewRow } = get();
    const col = Object.keys(columnMapping).find(k => columnMapping[k] === placeholderName);
    return col ? (rows[currentPreviewRow]?.[col] ?? '') : '';
  },

  dismissInfoBar: () => set({ dataTransitionBeat: 0 }),

  reset: () => {
    clearBeatTimer();
    set({ ...initial, imageFiles: new Map<string, Blob>(), imageResolutions: {} });
  },


}));
