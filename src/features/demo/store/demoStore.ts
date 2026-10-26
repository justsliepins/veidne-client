import { create } from 'zustand';
import { createSampleDocument } from '../utils/sampleDocument';
import { SAMPLE_COLUMNS, SAMPLE_ROWS } from '../utils/sampleData';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';

export type DemoStep = 'idle' | 'step1_click' | 'step1_name' | 'step1_celebrate'
  | 'step2_click' | 'step2_name' | 'step2_celebrate' | 'step3_bridge' | 'step3_choose' | 'step3_kit'
  | 'step4_preview' | 'step4_celebrate' | 'step5_cta' | 'sandbox' | 'dismissed';

const MSG: Partial<Record<DemoStep, string>> = {
  step1_click: 'demo.coaching.step1.instruction', step1_name: 'demo.coaching.step1.name',
  step1_celebrate: 'demo.coaching.step1.celebrate', step2_click: 'demo.coaching.step2.instruction',
  step2_name: 'demo.coaching.step2.name', step2_celebrate: 'demo.coaching.step2.celebrate',
  step3_bridge: 'demo.step5', step3_choose: 'demo.step6', step3_kit: 'demo.step7',
  step4_preview: 'demo.coaching.step4.instruction',
  step4_celebrate: 'demo.coaching.step4.celebrate', step5_cta: 'demo.coaching.step5.heading',
};
const TARGETS: Partial<Record<DemoStep, string[]>> = {
  step1_click: ['Sarah,', 'Sarah.'], step2_click: ['Portland', 'Office,'],
};
export function getCoachingMessage(step: DemoStep): string | null { return MSG[step] ?? null; }
export function getDemoTargetTokens(step: DemoStep): string[] { return TARGETS[step] ?? []; }

let unsub: (() => void) | null = null;
let unsub2: (() => void) | null = null;
function cleanup() { if (unsub) { unsub(); unsub = null; } if (unsub2) { unsub2(); unsub2 = null; } }

interface DemoState {
  demoStep: DemoStep; isActive: boolean;
  startDemo: () => void; skipDemo: () => void; loadSampleData: () => void;
  uploadMyDocument: () => void; exploreMore: () => void; advanceStep: (step: DemoStep) => void;
  reset: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  demoStep: 'idle' as DemoStep, isActive: false,
  startDemo: () => {
    const { tokens, html, rawDocxBytes } = createSampleDocument();
    useEditorStore.setState({
      rawDocxBytes, fileName: 'invitation.docx', htmlContent: html, wordTokens: tokens,
      placeholders: [], selectedPlaceholderId: null, hoveredTokenId: null,
      history: [{ placeholders: [] }], historyIndex: 0, lastActionResult: null,
      selectionState: 'idle', firstClickTokenId: null, selectedTokenIds: [],
    });
    useDataStore.setState({ editorPhase: 'placeholders' });
    set({ demoStep: 'step1_click', isActive: true });
    const bridgeFlow = () => {
      useDataStore.setState({ editorPhase: 'excelUpload', dataSubState: 'bridge' });
      set({ demoStep: 'step3_bridge' });
      setTimeout(() => {
        if (get().demoStep === 'step3_bridge') {
          set({ demoStep: 'step3_choose' });
          setTimeout(() => {
            if (get().demoStep === 'step3_choose') {
              useDataStore.setState({ dataSubState: 'kit' });
              set({ demoStep: 'step3_kit' });
            }
          }, 4000);
        }
      }, 3000);
    };
    unsub = useEditorStore.subscribe((state, prev) => {
      const { demoStep } = get();
      if (state.selectedTokenIds.length > 0 && prev.selectedTokenIds.length === 0) {
        if (demoStep === 'step1_click') set({ demoStep: 'step1_name' });
      }
      if (state.selectionState === 'rangeSelected' && prev.selectionState !== 'rangeSelected') {
        if (demoStep === 'step2_click') set({ demoStep: 'step2_name' });
      }
      if (state.placeholders.length > prev.placeholders.length) {
        const count = state.placeholders.length;
        if (demoStep === 'step1_click' || demoStep === 'step1_name') {
          set({ demoStep: 'step1_celebrate' });
          setTimeout(() => { if (get().demoStep === 'step1_celebrate') { if (count >= 2) bridgeFlow(); else set({ demoStep: 'step2_click' }); } }, 3000);
        } else if (demoStep === 'step2_click' || demoStep === 'step2_name') {
          set({ demoStep: 'step2_celebrate' });
          setTimeout(() => { if (get().demoStep === 'step2_celebrate') bridgeFlow(); }, 3000);
        } else if (demoStep === 'step1_celebrate' || demoStep === 'step2_celebrate') {
          bridgeFlow();
        }
      }
    });
    unsub2 = useDataStore.subscribe((state, prev) => {
      if (!get().isActive) return;
      if (state.editorPhase === 'preview' && prev.editorPhase === 'mapping') {
        set({ demoStep: 'step4_preview' });
        setTimeout(() => {
          if (get().demoStep === 'step4_preview') {
            set({ demoStep: 'step4_celebrate' });
            setTimeout(() => { if (get().demoStep === 'step4_celebrate') set({ demoStep: 'step5_cta' }); }, 3000);
          }
        }, 5000);
      }
    });
  },
  skipDemo: () => { cleanup(); set({ demoStep: 'sandbox', isActive: false }); },
  loadSampleData: () => {
    const phNames = useEditorStore.getState().placeholders.map(p => p.name);
    const mapping: Record<string, string> = {};
    if (phNames.includes('Name')) mapping['Name'] = 'Name';
    if (phNames.includes('Location')) mapping['Office'] = 'Location';
    const matched = Object.entries(mapping).map(([column, placeholder]) => ({ column, placeholder, confidence: 'exact' as const }));
    useDataStore.setState({
      isSampleData: true,
      columns: SAMPLE_COLUMNS, rows: SAMPLE_ROWS, columnMapping: mapping,
      matchResult: { matched, unmatchedColumns: SAMPLE_COLUMNS.filter(c => !mapping[c]),
        unmatchedPlaceholders: phNames.filter(p => !Object.values(mapping).includes(p)) },
      currentPreviewRow: 0, editorPhase: 'mapping', dataSubState: 'mapping', rawXlsxBytes: null, fileName: 'sample-data.xlsx',
    });
  },
  uploadMyDocument: () => {
    cleanup();
    useEditorStore.setState({
      rawDocxBytes: null, fileName: null, htmlContent: null, wordTokens: [],
      placeholders: [], selectedPlaceholderId: null, hoveredTokenId: null,
      history: [{ placeholders: [] }], historyIndex: 0, lastActionResult: null,
      selectionState: 'idle', firstClickTokenId: null, selectedTokenIds: [],
    });
    useDataStore.getState().reset();
    useDataStore.setState({ editorPhase: 'upload' });
    set({ demoStep: 'dismissed', isActive: false });
  },
  exploreMore: () => { cleanup(); set({ demoStep: 'sandbox', isActive: false }); },
  advanceStep: (step) => set({ demoStep: step }),
  reset: () => { cleanup(); set({ demoStep: 'idle', isActive: false }); },
}));
