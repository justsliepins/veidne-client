import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useBlocker } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { mergeClasses, Spinner } from '@fluentui/react-components';
import { ArrowUndo16Regular, ArrowRedo16Regular, TableRegular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { features } from '@/config/features';
import { trackEvent } from '@/services/analyticsService';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { CompletionBar } from '@/shared/components/CompletionBar';
import { DropZone } from '@/shared/components/DropZone';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { ErrorToast } from '@/shared/components/ErrorToast';
import { BugReportModal } from '@/features/bug-report/components/BugReportModal';
import { useEditorStore } from '../../store/editorStore';
import { useDataStore, type EditorPhase, type DataSubState } from '@/features/data/store/dataStore';
import { useGeneratorStore } from '@/features/generator/store/generatorStore';
import { useDemoStore } from '@/features/demo/store/demoStore';
import { useDoneGuard } from '@/features/generator/store/doneGuard';
import { loadInstantPreview } from '@/features/demo/utils/instantPreview';
import { CoachingStrip } from '@/features/demo/components/CoachingStrip';
import { SampleDataBanner } from '../../components/SampleDataBanner';
import { DocumentArea } from '../../components/DocumentArea';
import { ResumeScreen } from '../../components/ResumeScreen';
import { PlaceholderSidebar } from '../../components/PlaceholderSidebar';
import { FieldNudge } from '../../components/FieldNudge';
import { PreviewPanel } from '../../components/PreviewPanel';
import { ColumnMappingModal } from '@/features/data/components/ColumnMappingModal';
import { DataUploadGuidance } from '@/features/data/components/DataUploadGuidance';
import { ImageIntakePanel } from '@/features/data/components/ImageIntakePanel';
import { PicturesModal } from '@/features/data/components/PicturesModal';
import { matchImageField } from '@/features/data/utils/imageMatch';
import { BridgeScreen } from '@/features/data/components/BridgeScreen';
import { KitFlow } from '@/features/data/components/KitFlow';
import { MatchDataScreen } from '@/features/data/components/MatchDataScreen';
import { DataLoadedInfoBar } from '@/features/data/components/DataLoadedInfoBar';
import { RegionalFormatBar } from '@/features/data/components/RegionalFormatBar';
import type { RegionalColumns } from '@/features/data/utils/excelParser';
import { TemplateUploadGuidance } from '../../components/TemplateUploadGuidance';
import { GenerateProgressModal } from '@/features/generator/components/GenerateProgress';
import { GenerateErrorPanel } from '@/features/generator/components/GenerateErrorPanel';
import { describeGenerateFailure, type GenerateFailure } from '@/features/generator/utils/generateFailure';
import { focusAfterDialog } from '@/shared/utils/focusAfterDialog';
import { DoneView } from '@/features/generator/pages/Done';
import { DownloadMenu } from '../../components/DownloadMenu';
import { downloadTaggedTemplate } from '@/features/generator/utils/sourceFiles';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { useBeforeUnload } from '@/shared/hooks/useBeforeUnload';
import { saveSession, toBase64, clearSession, loadSession, fromBase64, type SavedSession } from '../../utils/sessionPersistence';
import { TemplateSyntaxError, describeTemplateError } from '@/features/generator/utils/documentGenerator';
import { templateSyntaxMessage } from '../../utils/templateSyntaxMessage';
import { useStyles } from './Editor.styles';

// Sample rows are text, so nothing in them follows regional settings.
const NO_REGIONAL: RegionalColumns = { dates: [], numbers: [] };

export function Editor() {
  const s = useStyles();
  const { placeholders, lastActionResult, cancelSelection, undo, redo, loadDocument, historyIndex, historyLength, fileName, rawDocxBytes } = useEditorStore(
    useShallow((s) => ({ placeholders: s.placeholders, lastActionResult: s.lastActionResult, cancelSelection: s.cancelSelection, undo: s.undo, redo: s.redo, loadDocument: s.loadDocument, historyIndex: s.historyIndex, historyLength: s.history.length, fileName: s.fileName, rawDocxBytes: s.rawDocxBytes })),
  );
  const baseName = fileName?.replace(/\.docx$/i, '') ?? 'document';
  const { editorPhase, setPhase, rows, columnMapping, matchResult, loadExcel, applyMapping, cancelMapping, getFilledValue, dataTransitionBeat, dismissInfoBar, dataSubState, setDataSubState, matchWithLoadedTemplate } = useDataStore(
    useShallow((s) => ({ editorPhase: s.editorPhase, setPhase: s.setPhase, rows: s.rows, columnMapping: s.columnMapping, matchResult: s.matchResult, loadExcel: s.loadExcel, applyMapping: s.applyMapping, cancelMapping: s.cancelMapping, getFilledValue: s.getFilledValue, dataTransitionBeat: s.dataTransitionBeat, dismissInfoBar: s.dismissInfoBar, dataSubState: s.dataSubState, setDataSubState: s.setDataSubState, matchWithLoadedTemplate: s.matchWithLoadedTemplate })),
  );
  const dataColumns = useDataStore((s) => s.columns);
  const isSampleData = useDataStore((s) => s.isSampleData);
  const { formatConventions, regionalColumns, setFormatConventions } = useDataStore(
    useShallow((s) => ({ formatConventions: s.formatConventions, regionalColumns: s.regionalColumns, setFormatConventions: s.setFormatConventions })),
  );
  const regional = isSampleData ? NO_REGIONAL : regionalColumns;
  const hasUnsavedWork = editorPhase !== 'upload' && editorPhase !== 'done';
  useBeforeUnload(hasUnsavedWork);
  // On the Done screen the question comes from DoneView: it is set while a
  // real run has documents that were never downloaded, and read when the
  // navigation happens, so the screen's own "Discard" paths (which clear it
  // first) are not asked twice (review b, finding 1).
  const shouldBlock = useCallback(() => hasUnsavedWork || useDoneGuard.getState().message !== null, [hasUnsavedWork]);
  const blocker = useBlocker(shouldBlock);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const doneMessage = useDoneGuard.getState().message;
      if (window.confirm(doneMessage ?? t('editor.unsavedWarning'))) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  const { generate, cancel } = useGeneratorStore(
    useShallow((s) => ({ generate: s.generate, cancel: s.cancel })),
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const { isActive: demoActive, demoStep, startDemo, skipDemo, loadSampleData, uploadMyDocument, exploreMore } = useDemoStore(
    useShallow((s) => ({ isActive: s.isActive, demoStep: s.demoStep, startDemo: s.startDemo, skipDemo: s.skipDemo, loadSampleData: s.loadSampleData, uploadMyDocument: s.uploadMyDocument, exploreMore: s.exploreMore })),
  );
  // Start the fields panel collapsed on mobile (slim bar) so the document is the
  // primary surface; expanded by default on desktop.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // A failed generation is shown in a panel at the top of the preview, not in
  // the toast: it names the cause when known and offers the fix, the private
  // bug-report channel, and the same review link every other surface uses.
  const [generateError, setGenerateError] = useState<GenerateFailure | null>(null);
  // Bumped on every failed run so the panel takes focus again.
  const [generateAttempt, setGenerateAttempt] = useState(0);
  const [errorSticky, setErrorSticky] = useState(false);
  // Below 768 px the preview panel covers the document column; the error panel
  // and the template link then go inside it.
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  // The template whose failure already showed the review ask.
  const errorAskShownFor = useRef<ArrayBuffer | null>(null);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const dismissError = useCallback(() => { setErrorMsg(null); setErrorSticky(false); }, []);
  // A refused template stays on screen with the reason until dismissed; any
  // other load failure is the short generic toast.
  const showDocumentLoadError = useCallback((e: unknown) => {
    if (e instanceof TemplateSyntaxError) { setErrorMsg(templateSyntaxMessage(e.info)); setErrorSticky(true); }
    else setErrorMsg(t('error.file.corrupt'));
  }, []);
  // Brief parsing indicator for the upload drop zones.
  const [parsing, setParsing] = useState(false);
  // First-run, one-time field nudge: shown once ever, never reappears after the
  // first field is created or it is dismissed.
  const NUDGE_KEY = 'veidne_field_nudge_seen';
  const [fieldNudgeSeen, setFieldNudgeSeen] = useState(() => {
    try { return localStorage.getItem(NUDGE_KEY) === '1'; } catch { return false; }
  });
  const retireFieldNudge = useCallback(() => {
    setFieldNudgeSeen(true);
    try { localStorage.setItem(NUDGE_KEY, '1'); } catch { /* ignore */ }
  }, []);
  // The instruction line is retired by the first manually created field (see the
  // lastActionResult effect below). Auto-detected fields do not retire it: they
  // switch it to the "we found N" wording so it keeps teaching the click action.
  // The flow can change once after mount: a spreadsheet dropped at the upload
  // step switches to the data-first path the old start matrix offered.
  // The demo and the finished example used to delete a saved project on
  // arrival. With a project saved they first show the resume screen, which says
  // what starting the sample does (review a, finding 3; review b, finding 5).
  const [pendingSample, setPendingSample] = useState<{ flow: 'exploring' | 'instant'; src: string | null } | null>(() => {
    const f = searchParams.get('flow');
    if (f !== 'exploring' && f !== 'instant') return null;
    return loadSession()?.rawDocxBase64 ? { flow: f, src: searchParams.get('src') } : null;
  });
  const [flow, setFlow] = useState(() => (pendingSample ? 'template-data' : searchParams.get('flow') ?? 'template-data'));
  const instantOpenedRef = useRef(false);
  // "Upload My Document" in the demo hands over to the person's own file: the
  // upload step of the normal flow, saved from then on. Without the flow
  // change the upload step would keep showing the demo's spinner (review b,
  // finding 3).
  const handleUploadMyDocument = useCallback(() => { uploadMyDocument(); setFlow('template-data'); }, [uploadMyDocument]);
  const [resumeSession, setResumeSession] = useState<SavedSession | null>(() => {
    const f = searchParams.get('flow');
    if (f && !pendingSample) return null;
    // Back in the same tab with the project still open (the stores keep it
    // from page to page): the editor shows it as it is, with its real steps.
    if (!pendingSample && useEditorStore.getState().rawDocxBytes !== null && useDataStore.getState().editorPhase !== 'upload') return null;
    const session = loadSession();
    return session?.rawDocxBase64 ? session : null;
  });
  const phaseSteps = {
    upload:      ['active',   'pending', 'pending', 'pending'],
    placeholders:['complete', 'active',  'pending', 'pending'],
    excelUpload: ['complete', 'complete', 'active', 'pending'],
    mapping:     ['complete', 'complete', 'active', 'pending'],
    preview:     ['complete', 'complete', 'complete', 'active'],
    generating:  ['complete', 'complete', 'complete', 'active'],
    done:        ['complete', 'complete', 'complete', 'complete'],
  } as const;
  const dataSubLabelMap = {
    bridge: t('completionBar.data.sub.getSpreadsheet'),
    kit: t('completionBar.data.sub.getSpreadsheet'),
    upload: t('completionBar.data.sub.uploadSpreadsheet'),
    mapping: t('completionBar.data.sub.reviewMapping'),
    preview: t('completionBar.data.sub.preview'),
    matchData: t('completionBar.data.sub.uploadSpreadsheet'),
    pictures: t('completionBar.data.sub.preview'),
  } as const;
  // The Data step is complete on the Generate step; a 'Preview' sub-label
  // under it there was stray, so the sub-label only shows mid-data-phase.
  const dataSubLabel = editorPhase === 'excelUpload' || editorPhase === 'mapping'
    ? dataSubLabelMap[dataSubState] : undefined;
  const step1Label = flow === 'document-only' ? t('completionBar.document') : t('completionBar.template');
  const stepLabels = [step1Label, t('completionBar.placeholders'), t('completionBar.data'), t('completionBar.generate')];
  const allSteps = stepLabels.map((label, i) => ({
    label, status: phaseSteps[editorPhase][i], subLabel: i === 2 ? dataSubLabel : undefined,
  }));
  const steps = resumeSession ? allSteps.map(st => ({ ...st, status: 'pending' as const }))
    : flow === 'template-only' ? allSteps.slice(0, 2)
    : flow === 'data-only' ? allSteps.slice(2)
    : allSteps;
  const handleDocFile = useCallback(async (file: File) => {
    setParsing(true);
    try { await loadDocument(file); setPhase('placeholders'); trackEvent('document_uploaded'); }
    catch (e) { showDocumentLoadError(e); }
    finally { setParsing(false); }
  }, [loadDocument, setPhase, showDocumentLoadError]);
  const handleExcelFile = useCallback(async (file: File) => {
    setParsing(true);
    try { await loadExcel(file); trackEvent('excel_uploaded'); }
    catch { setErrorMsg(t('error.file.parseError')); }
    finally { setParsing(false); }
  }, [loadExcel]);
  const handleFileError = useCallback((err: { message: string }) => setErrorMsg(err.message), []);
  // One drop zone at the upload step, routed on what it receives: a Word file
  // goes to the fields step, a spreadsheet to the data-first path (the
  // spreadsheet is matched to a template afterwards).
  const handleStartFile = useCallback((file: File) => {
    if (/\.xlsx?$/i.test(file.name)) {
      setFlow('data-only');
      void handleExcelFile(file);
    } else {
      void handleDocFile(file);
    }
  }, [handleDocFile, handleExcelFile]);
  // Same-route entry into the instant preview: a <Link to="?flow=instant">
  // would not remount Editor, so the preview is loaded directly, with the
  // same event the mount-time entry records.
  const handleSampleData = useCallback(() => {
    loadInstantPreview();
    trackEvent('instant_preview_opened', { source: 'start_upload' });
  }, []);
  const handleContinue = useCallback(() => {
    if (!resumeSession?.rawDocxBase64) return;
    setResumeSession(null); setPendingSample(null);
    // The spreadsheet and the column choices are never saved, so a project
    // saved in the column dialog or while generating resumes in the preview,
    // whose empty state says "Add your data" (review b, finding 12).
    const needsRows = resumeSession.editorPhase === 'mapping' || resumeSession.editorPhase === 'generating';
    useEditorStore.getState().restoreSession(fromBase64(resumeSession.rawDocxBase64), resumeSession.sourceFileName, resumeSession.placeholders).then(() => {
      const ds = useDataStore.getState();
      ds.setPhase((needsRows ? 'preview' : resumeSession.editorPhase) as EditorPhase);
      ds.setDataSubState((needsRows ? 'preview' : resumeSession.dataSubState) as DataSubState);
      ds.setKitDownloaded(resumeSession.kitDownloaded);
    });
    trackEvent('session_restored');
  }, [resumeSession]);
  const handleStartFresh = useCallback(() => { clearSession(); useEditorStore.getState().reset(); useDataStore.getState().reset(); setResumeSession(null); }, []);
  // "Delete it and try the sample": the saved project goes, then the sample
  // the person asked for starts, as it would have without a saved project.
  const handleStartSample = useCallback(() => {
    if (!pendingSample) return;
    clearSession(); useEditorStore.getState().reset(); useDataStore.getState().reset();
    setResumeSession(null); setPendingSample(null);
    if (pendingSample.flow === 'exploring') {
      setFlow('exploring'); startDemo(); trackEvent('demo_started');
      // The save subscription of the normal flow is still on until this click
      // has rendered, and startDemo just put the sample letter in the editor:
      // drop that pending save, so the demo is never kept as the person's project.
      clearSession();
    } else {
      loadInstantPreview();
      trackEvent('instant_preview_opened', { source: pendingSample.src === 'matrix' ? 'start_matrix' : 'hero_mockup' });
    }
  }, [pendingSample, startDemo]);
  // A file dropped on the resume screen starts over, routed like the start
  // screen: a Word file to the fields step, a spreadsheet to the data-first path.
  const handleResumeFile = useCallback((file: File) => {
    clearSession(); setResumeSession(null);
    if (/\.xlsx?$/i.test(file.name)) { useEditorStore.getState().reset(); useDataStore.getState().reset(); handleStartFile(file); }
    else void handleDocFile(file);
  }, [handleDocFile, handleStartFile]);
  const handleMatchDataTemplate = useCallback(async (file: File) => {
    try {
      await loadDocument(file);
      matchWithLoadedTemplate();
      trackEvent('document_uploaded');
    } catch (e) { showDocumentLoadError(e); }
  }, [loadDocument, matchWithLoadedTemplate, showDocumentLoadError]);
  const handleMatchDataBack = useCallback(() => {
    useDataStore.getState().reset();
    setPhase('excelUpload');
  }, [setPhase]);
  useEffect(() => {
    useGeneratorStore.getState().reset(); useDemoStore.getState().reset();
    // A sample link with a saved project: keep the project; the resume screen
    // asks. A project still open in this tab is saved, so the editor starts
    // from the resume screen as after a reload.
    if (pendingSample) {
      useEditorStore.getState().reset(); useDataStore.getState().reset();
      setSearchParams({}, { replace: true }); return;
    }
    const flow = searchParams.get('flow');
    if (flow) {
      clearSession(); useEditorStore.getState().reset(); useDataStore.getState().reset();
    }
    if (flow === 'instant') {
      loadInstantPreview();
      // Ref guard: StrictMode runs this effect twice in dev; the open event
      // must be recorded once per entry.
      if (!instantOpenedRef.current) {
        instantOpenedRef.current = true;
        trackEvent('instant_preview_opened', {
          source: searchParams.get('src') === 'matrix' ? 'start_matrix' : 'hero_mockup',
        });
      }
      setSearchParams({}, { replace: true });
      return;
    }
    if (flow === 'exploring') {
      startDemo(); setSearchParams({}, { replace: true }); trackEvent('demo_started'); return;
    }
    if (flow === 'data-only') {
      setPhase('excelUpload'); setSearchParams({}, { replace: true }); return;
    }
    if (flow === 'template-data') {
      setSearchParams({}, { replace: true }); return;
    }
    if (!flow && !loadSession()?.rawDocxBase64) { clearSession(); useEditorStore.getState().reset(); useDataStore.getState().reset(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (flow === 'exploring') return;
    let b64 = ''; let bytesRef: ArrayBuffer | null = null;
    const save = () => {
      const e = useEditorStore.getState(); const d = useDataStore.getState();
      if (!e.fileName || d.isSampleData) return;
      if (e.rawDocxBytes !== bytesRef) { bytesRef = e.rawDocxBytes; b64 = e.rawDocxBytes ? toBase64(e.rawDocxBytes) : ''; }
      saveSession({ sourceFileName: e.fileName, documentHtml: e.htmlContent ?? '', rawDocxBase64: b64,
        placeholders: e.placeholders, editorPhase: d.editorPhase, dataSubState: d.dataSubState, kitDownloaded: d.kitDownloaded, savedAt: Date.now() });
    };
    const unsub1 = useEditorStore.subscribe((s, p) => { if (s.placeholders !== p.placeholders || s.fileName !== p.fileName) save(); });
    const unsub2 = useDataStore.subscribe((s, p) => { if (s.editorPhase !== p.editorPhase || s.dataSubState !== p.dataSubState || s.kitDownloaded !== p.kitDownloaded) save(); });
    return () => { unsub1(); unsub2(); };
  }, [flow]);
  useEffect(() => {
    if (lastActionResult?.type !== 'created') return;
    // A manually created field means the instruction has done its job.
    retireFieldNudge();
    trackEvent(lastActionResult.fieldKind === 'image' ? 'image_field_created' : 'placeholder_created');
  }, [lastActionResult, retireFieldNudge]);
  useEffect(() => {
    if (editorPhase !== 'placeholders') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelSelection();
      const m = e.ctrlKey || e.metaKey;
      if (m && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (m && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler);
  }, [editorPhase, cancelSelection, undo, redo]);
  // Phase watcher: a finished run has nothing left to resume. Analytics does not
  // live here: this effect also runs when Editor remounts with a stale 'done'
  // phase (zustand stores outlive the route), and an event keyed on it was the
  // source of the zero-count generate_completed rows. The event fires from
  // handleGenerate, next to generate_started, where a run is known to be real.
  useEffect(() => {
    if (editorPhase === 'done') clearSession();
  }, [editorPhase]);
  // The failure panel belongs to the preview it happened on.
  useEffect(() => {
    if (editorPhase !== 'preview' && editorPhase !== 'generating') setGenerateError(null);
  }, [editorPhase]);
  const handleUseMyFiles = useCallback(() => {
    trackEvent('instant_preview_swapped');
    clearSession();
    useEditorStore.getState().reset();
    useDataStore.getState().reset();
    useDemoStore.getState().reset();
  }, []);
  // Forward from the Fields step. Data already loaded means back to the
  // preview, never a second request for the same spreadsheet; but data that
  // was never matched (the fields were added after the upload) goes through
  // matching first, so the new fields get their columns.
  const goForwardFromFields = useCallback(() => {
    if (rows.length > 0) {
      if (Object.keys(columnMapping).length === 0 && placeholders.length > 0) matchWithLoadedTemplate();
      else setPhase('preview');
      return;
    }
    setPhase('excelUpload');
    if (flow === 'template-data') setDataSubState('upload');
  }, [rows.length, columnMapping, placeholders.length, matchWithLoadedTemplate, setPhase, setDataSubState, flow]);
  const handleScrollTo = useCallback((id: string) => {
    document.querySelector(`[data-placeholder-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);
  // Every generate_started that does not end in generate_completed records
  // why, so a blocked user shows up as a reason and not as an unmatched row.
  const handleGenerate = useCallback(async () => {
    // A run already in flight: further clicks are not attempts, so they are
    // neither started nor reported as failed.
    if (useGeneratorStore.getState().isGenerating) return;
    trackEvent('generate_started', useDataStore.getState().isSampleData ? { sample: true } : undefined);
    setGenerateError(null);
    if (!rawDocxBytes) { trackEvent('generate_failed', { path: 'no_document' }); return; }
    try { await generate(rawDocxBytes, placeholders, rows, columnMapping, fileName ?? 'document.docx'); }
    catch (e) {
      const info = describeTemplateError(e);
      trackEvent('generate_failed', {
        path: 'error',
        error: info?.id ?? (e instanceof Error ? e.name : 'unknown'),
        ...(info?.file ? { part: info.file } : {}),
      });
      setGenerateError(describeGenerateFailure(e, placeholders));
      setGenerateAttempt((n) => n + 1);
      // One impression per template, however many times Generate is pressed.
      if (errorAskShownFor.current !== rawDocxBytes) {
        errorAskShownFor.current = rawDocxBytes;
        trackEvent('review_ask_shown', { variant: 'error' });
      }
      return;
    }
    // generate() resolves normally on cancel too (the loop just stops and the
    // phase goes back to 'preview'), so a cancelled run must not count as
    // completed. Only a run that actually reached 'done' is reported.
    if (useGeneratorStore.getState().cancelled) { trackEvent('generate_failed', { path: 'cancelled' }); return; }
    if (useDataStore.getState().editorPhase !== 'done') { trackEvent('generate_failed', { path: 'not_done' }); return; }
    const count = useGeneratorStore.getState().generatedFiles.length;
    // images: total pictures matched for the run, present only when the
    // template carries image fields (so flag-off payloads are unchanged).
    const ds = useDataStore.getState();
    const imageFields = useEditorStore.getState().placeholders.filter((p) => p.type === 'image');
    const images = imageFields.reduce((n, f) =>
      n + matchImageField(f.name, ds.columnMapping, ds.rows, ds.imageFiles.keys(), ds.imageResolutions).matchedCount, 0);
    trackEvent('generate_completed', {
      count: String(count),
      ...(imageFields.length > 0 ? { images } : {}),
      ...(ds.isSampleData ? { sample: true } : {}),
    });
  }, [generate, placeholders, rows, columnMapping, rawDocxBytes, fileName]);
  const coaching = demoActive ? <CoachingStrip demoStep={demoStep} onSkip={skipDemo}
    onLoadData={loadSampleData} onUploadMyDocument={handleUploadMyDocument} onExploreMore={exploreMore} /> : null;
  // Persistent instruction line on the Fields step (not in the demo, which has
  // its own coaching). It stays until dismissed or the first manual field.
  const showFieldNudge = !demoActive && editorPhase === 'placeholders' && !fieldNudgeSeen;
  const nudgeText = [
    placeholders.length === 0
      ? t('placeholder.instruct.empty')
      : t(placeholders.length === 1 ? 'placeholder.instruct.foundOne' : 'placeholder.instruct.found', { count: String(placeholders.length) }),
    features.imagePlaceholders ? t('placeholder.instruct.pictures') : null,
  ].filter(Boolean).join(' ');
  // Fields that no spreadsheet column fills come out blank in every document.
  // Image fields are matched by picture name, not by column, so they are left out.
  const mappedFieldNames = new Set(Object.values(columnMapping));
  const emptyFieldNames = placeholders.filter((p) => p.type !== 'image' && !mappedFieldNames.has(p.name)).map((p) => p.name);
  const filledFieldCount = placeholders.length - emptyFieldNames.length;
  const isPreview = editorPhase === 'preview';
  const isDone = editorPhase === 'done';
  const isGenerating = editorPhase === 'generating';
  const showDownload = editorPhase === 'placeholders' || (editorPhase === 'excelUpload' && dataSubState === 'bridge');
  const downloadMenu = <DownloadMenu rawDocxBytes={rawDocxBytes} placeholders={placeholders} baseName={baseName} />;
  // The right slot of the step bar holds exactly two things on one line: the
  // template link to the left of Generate, then the button. Generate stays one
  // click with nothing in front of it. The link is hidden for sample data,
  // whose template is not the user's.
  // Generate stays available while a failure panel is shown: the panel says
  // what to change, and a retry after a change is the way out. The store's
  // in-flight guard still keeps runs from overlapping.
  // Below 768 px the step bar has no room for the template link next to
  // Generate (it covered the step labels), so it moves into the preview panel.
  const saveTemplate = !isSampleData && rawDocxBytes && placeholders.length > 0 && (
    <button type="button" className={isNarrow ? s.saveTemplateLinkPanel : s.saveTemplateLink} onClick={() => downloadTaggedTemplate('generate')}>
      {t('generate.saveTemplate')}
    </button>
  );
  const generateBtn = <div className={s.generateRow}>
    {!isNarrow && saveTemplate}
    <button type="button" ref={generateBtnRef} className={s.btnGenerate} onClick={handleGenerate}>
      {t('generate.button')} <span className={s.countBadge}>{t('generate.count', { count: String(rows.length) })}</span>
    </button>
  </div>;
  const errorPanel = generateError && (
    <GenerateErrorPanel failure={generateError} attempt={generateAttempt}
      onRetry={() => void handleGenerate()}
      onGoToFields={() => setPhase('placeholders')}
      onReport={() => setBugReportOpen(true)}
      onDismiss={() => { setGenerateError(null); focusAfterDialog(() => generateBtnRef.current); }} />
  );
  // Notices at the top of the preview. Below 768 px the preview panel covers
  // the document column, so they render at the top of that panel instead;
  // otherwise the empty-field warning and the failure panel were hidden on phones.
  const previewNotices = (
    <>
      {errorPanel}
      {isSampleData && <SampleDataBanner onUseMyFiles={handleUseMyFiles} />}
      <DataLoadedInfoBar beat={dataTransitionBeat} rowCount={rows.length}
        fieldCount={filledFieldCount} onDismiss={dismissInfoBar}
        emptyFields={isSampleData ? [] : emptyFieldNames} onChooseColumns={matchResult ? () => setPhase('mapping') : undefined} />
    </>
  );
  return (
    <PageLayout navVariant="light" editorNav showFooter={false} fillViewport>
      <PageSeo title={t('meta.editor.title')} description={t('meta.editor.description')} path="/editor" noindex />
      <div className={s.root}>
        {!isDone && <CompletionBar steps={steps} variant={isPreview ? 'compact' : 'standard'}
          leftAction={showDownload ? downloadMenu : undefined}
          rightAction={isPreview && rows.length > 0 ? generateBtn : undefined} />}
        <div className={mergeClasses(s.content, isPreview && s.contentCompact, isDone && s.contentDone)}
          style={editorPhase === 'placeholders' && placeholders.length > 0 ? { ['--forward-bar-inset' as string]: '78px' } : undefined}>
          {editorPhase === 'upload' && (flow === 'exploring' ? (
            <div className={s.demoLoading}>
              <Spinner size="medium" />
              <span className={s.demoLoadingLabel}>{t('demo.loading')}</span>
            </div>
          ) : resumeSession ? (
            <ResumeScreen session={resumeSession} onContinue={handleContinue} onStartFresh={pendingSample ? handleStartSample : handleStartFresh}
              sample={pendingSample !== null} onFile={handleResumeFile} onFileError={handleFileError} />
          ) : (
            <div className={s.uploadWrapper}>
              <TemplateUploadGuidance />
              <DropZone accept={['.docx', '.xlsx', '.xls']} onFile={handleStartFile} onError={handleFileError} titleKey="dropZone.title" subtitleKey="dropZone.subtitle" formatHintKey="dropZone.formats" wrongTypeKey="error.file.wrongType.start" tooLargeKey="error.file.tooLargeDoc" reassuranceKey="privacy.local" loading={parsing} />
              {/* The two destinations the start matrix offered that are not
                  this drop zone, as quiet links, not cards. */}
              <div className={s.uploadLinks}>
                <button type="button" className={s.uploadLink} onClick={handleSampleData}>{t('editor.upload.sampleLink')}</button>
                <button type="button" className={s.uploadLink} onClick={() => useTemplateStore.getState().openLibrary()}>{t('editor.upload.libraryLink')}</button>
              </div>
            </div>
          ))}
          {(editorPhase === 'placeholders' || editorPhase === 'mapping') && placeholders.length > 0 && (
            <div className={s.undoToolbar}>
              <button type="button" className={mergeClasses(s.undoBtn, historyIndex === 0 && s.undoBtnDisabled)}
                disabled={historyIndex === 0} onClick={() => undo()}>
                <ArrowUndo16Regular />{t('placeholder.toast.undo')}
              </button>
              <button type="button" className={mergeClasses(s.undoBtn, historyIndex >= historyLength - 1 && s.undoBtnDisabled)}
                disabled={historyIndex >= historyLength - 1} onClick={() => redo()}>
                <ArrowRedo16Regular />{t('placeholder.toast.redo')}
              </button>
            </div>
          )}
          {(editorPhase === 'placeholders' || editorPhase === 'mapping') && <div className={mergeClasses(s.documentWrapper, sidebarCollapsed && s.documentWrapperFull)}>
            <div className={s.documentColumn}>{coaching}{showFieldNudge && <FieldNudge text={nudgeText} onDismiss={retireFieldNudge} />}<DocumentArea /></div>
            <PlaceholderSidebar onScrollTo={handleScrollTo} collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(c => !c)} dataLoaded={rows.length > 0}
              onUploadData={goForwardFromFields} />
          </div>}
          {editorPhase === 'excelUpload' && (dataSubState === 'matchData' ? (
            <MatchDataScreen columns={dataColumns} rowCount={rows.length}
              onUploadTemplate={handleMatchDataTemplate} onBack={handleMatchDataBack} />
          ) : dataSubState === 'bridge' && placeholders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, overflow: 'auto' }}>{coaching}<BridgeScreen placeholders={placeholders.map(p => ({ name: p.name, colorIndex: p.colorIndex }))}
              onUpload={handleExcelFile} onCreateKit={() => { setDataSubState('kit'); if (demoActive) useDemoStore.getState().advanceStep('step3_kit'); }}
              onBack={() => setPhase('placeholders')} pulseRight={demoStep === 'step3_choose'} />
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px 24px' }}><ImageIntakePanel /></div></div>
          ) : dataSubState === 'kit' ? (
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, overflow: 'auto' }}>{coaching}<KitFlow placeholders={placeholders.map(p => ({ name: p.name, colorIndex: p.colorIndex }))}
              baseName={baseName} onUpload={handleExcelFile} onError={handleFileError}
              onBack={() => setDataSubState('bridge')} />
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px 24px' }}><ImageIntakePanel /></div></div>
          ) : (
            <div className={s.uploadWrapper}>
              <DataUploadGuidance placeholders={placeholders.map(p => ({ name: p.name, colorIndex: p.colorIndex }))} />
              <DropZone accept={['.xlsx', '.xls']} onFile={handleExcelFile} onError={handleFileError} icon={TableRegular} titleKey="data.upload.title" subtitleKey="data.upload.subtitle" formatHintKey="dropZone.formats" wrongTypeKey="error.file.wrongType.data" tooLargeKey="error.file.tooLargeData" reassuranceKey="privacy.local" loading={parsing} />
              <ImageIntakePanel />
              <VeidneButton appearance="transparent" onClick={() => setPhase('placeholders')} style={{ marginTop: '16px' }}>{t('bridge.backToFields')}</VeidneButton>
            </div>
          ))}
          {isPreview && <div className={mergeClasses(s.documentWrapper, s.documentWrapperPreview)}>
            <div className={s.documentColumn}>
              {coaching}
              {!isNarrow && previewNotices}
              {/* Shown once the load transition is over, like the warning bar. On
                  phones the same line is a card inside the preview panel. */}
              {!isNarrow && rows.length > 0 && (regional.dates.length > 0 || regional.numbers.length > 0) && (dataTransitionBeat === 0 || dataTransitionBeat >= 4) && (
                <div className={s.formatsBar}>
                  <RegionalFormatBar regional={regional} value={formatConventions} onChange={setFormatConventions} />
                </div>
              )}
              <DocumentArea previewMode getFilledValue={getFilledValue} transitionBeat={dataTransitionBeat} />
            </div>
            <PreviewPanel onBackToPlaceholders={() => setPhase('placeholders')}
              onUploadData={() => { setPhase('excelUpload'); setDataSubState('upload'); }} transitionBeat={dataTransitionBeat}
              topSlot={isNarrow ? previewNotices : undefined} templateAction={isNarrow ? saveTemplate : undefined} />
          </div>}
          {isDone && <DoneView isDemo={flow === 'exploring'} />}
          {editorPhase === 'placeholders' && placeholders.length > 0 && (
            <div className={s.mobileForwardBar}>
              <VeidneButton appearance="primary" style={{ width: '100%' }} onClick={goForwardFromFields}>
                {t(rows.length > 0 ? 'placeholder.sidebar.backToPreview' : 'placeholder.sidebar.uploadData')}
              </VeidneButton>
            </div>
          )}
        </div>
        {matchResult && <ColumnMappingModal key={matchResult.matched.map(m => m.column).join()} open={editorPhase === 'mapping'} matchResult={matchResult}
          rows={rows} placeholderNames={placeholders.map(p => p.name)}
          onApply={(m) => { applyMapping(m); focusAfterDialog(() => generateBtnRef.current); }}
          onCancel={cancelMapping} onReupload={handleExcelFile}
          onAddFields={() => setPhase('placeholders')}
          regional={regional} formats={formatConventions} onFormatsChange={setFormatConventions} appliedMapping={columnMapping} />}
        <PicturesModal />
        <GenerateProgressModal open={isGenerating} onCancel={() => { cancel(); focusAfterDialog(() => generateBtnRef.current); }} />
        <ErrorToast message={errorMsg ?? ''} visible={!!errorMsg} onDismiss={dismissError} sticky={errorSticky} />
        <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
      </div>
    </PageLayout>
  );
}
