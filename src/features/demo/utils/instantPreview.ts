import { createSampleDocument } from './sampleDocument';
import { SAMPLE_COLUMNS, SAMPLE_ROWS } from './sampleData';
import { findAllOccurrences, getSelectedText } from '@/features/editor/store/editorHelpers';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';
import type { Placeholder } from '@/features/editor/utils/types';

/**
 * One-click instant result: initialize the editor and data stores as if the
 * user had already uploaded the guided demo's sample document, created the
 * Name field across its occurrences, and applied the column mapping, landing
 * directly on the merged preview. Everything is synthesized in memory; no
 * network requests and no demo coach.
 */
export function loadInstantPreview(): void {
  const { tokens, html, rawDocxBytes } = createSampleDocument();

  // The same field the guided demo produces: "Sarah" across its occurrences,
  // resolved with the same helpers the click-to-create path uses.
  const sarah = tokens.find((tok) => tok.type === 'word' && /^Sarah\b/.test(tok.text));
  const placeholders: Placeholder[] = sarah
    ? [{
        id: `ph-${Date.now()}`,
        name: 'Name',
        originalText: getSelectedText(tokens, [sarah.id]),
        colorIndex: 0,
        occurrences: findAllOccurrences(tokens, [sarah.id]),
      }]
    : [];

  // Data store first so isSampleData is already true when editor-store
  // subscribers (e.g. session persistence) react to the document load.
  useDataStore.setState({
    isSampleData: true,
    columns: SAMPLE_COLUMNS,
    rows: SAMPLE_ROWS,
    columnMapping: { Name: 'Name' },
    matchResult: {
      matched: [{ column: 'Name', placeholder: 'Name', confidence: 'exact' }],
      unmatchedColumns: SAMPLE_COLUMNS.filter((c) => c !== 'Name'),
      unmatchedPlaceholders: [],
    },
    currentPreviewRow: 0,
    editorPhase: 'preview',
    dataSubState: 'preview',
    dataTransitionBeat: 0,
    rawXlsxBytes: null,
    fileName: 'sample-data.xlsx',
    namingConfig: { field: 'Name', prefix: undefined, secondField: null, dupeMode: 'number' },
  });

  useEditorStore.setState({
    rawDocxBytes,
    fileName: 'invitation.docx',
    htmlContent: html,
    wordTokens: tokens,
    placeholders,
    selectedPlaceholderId: null,
    hoveredTokenId: null,
    history: [{ placeholders: structuredClone(placeholders) }],
    historyIndex: 0,
    lastActionResult: null,
    selectionState: 'idle',
    firstClickTokenId: null,
    selectedTokenIds: [],
  });
}
