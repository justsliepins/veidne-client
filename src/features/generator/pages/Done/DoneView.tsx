import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { mergeClasses } from '@fluentui/react-components';
import { Checkmark28Regular, CheckmarkCircle20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { trackEvent } from '@/services/analyticsService';
import { getConvertApiUrl } from '@/services/pdfConversion';
import { features } from '@/config/features';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';
import { useGeneratorStore } from '../../store/generatorStore';
import { downloadTaggedTemplate, downloadUploadedSpreadsheet } from '../../utils/sourceFiles';
import { usePdfStore } from '../../store/pdfStore';
import { useDoneGuard } from '../../store/doneGuard';
import { DonateInline } from '@/features/donation/components/DonateInline';
import { FeedbackAsk } from '@/features/donation/components/FeedbackAsk';
import { DownloadCompleteModal, type DismissMethod } from '@/features/donation/components/DownloadCompleteModal';
import { isRecentDonor, isRecentlyDeclined, rememberDecline } from '@/features/donation/utils/askMemory';
import { FileList } from '../../components/FileList';
import { PdfFlow } from '../../components/PdfFlow';
import { focusAfterDialog } from '@/shared/utils/focusAfterDialog';
import { useStyles } from './DoneView.styles';

interface DoneViewProps {
  isDemo?: boolean;
}

// How the donation ask behaves after the first download of a run.
//  'modal'  : the dialog opens once (today's behaviour, made calmer); after it
//             closes, a one-line reminder stays near the top of the page.
//  'inline' : no dialog; the donation card moves up under the saved notice.
// 'inline' is a hypothesis to test with users first (features.expAskInline,
// off unless VITE_EXP_ASK_INLINE=true); the once-per-run and decline rules are not.
const ASK_AFTER_DOWNLOAD: 'modal' | 'inline' = features.expAskInline ? 'inline' : 'modal';

// Quiet time after a single-file download before the dialog may open, so a
// file-by-file run is never interrupted mid-way.
const FILE_MODAL_DELAY_MS = 4000;

// Per-run memory at module level, because the Done screen can mount more
// than once for one run (StrictMode, the PDF consent gate, the stale-phase
// remount). Keyed on the run's generated files array.
const modalOpenedForRun: { run: object | null } = { run: null };
// Runs whose heading has already taken focus, so a remount does not move it again.
const headingFocusedRuns = new WeakSet<object>();

type DownloadKind = 'word' | 'pdf' | 'file';

// What was downloaded in each run: the whole set (the Word zip or the PDFs)
// or single files, by name. The protection lasts until every document is
// saved, so checking one file of 24 does not end it (review a, finding 2).
// The marked template and the spreadsheet are not documents and do not count.
interface RunDownloads { set: boolean; singles: Set<string>; last: DownloadKind | null }
const runDownloads = new WeakMap<object, RunDownloads>();
function downloadsFor(run: object): RunDownloads {
  let d = runDownloads.get(run);
  if (!d) { d = { set: false, singles: new Set<string>(), last: null }; runDownloads.set(run, d); }
  return d;
}
function savedCountOf(run: object, count: number): number {
  const d = downloadsFor(run);
  return d.set ? count : Math.min(d.singles.size, count);
}

export function DoneView({ isDemo }: DoneViewProps) {
  const s = useStyles();
  const { generatedFiles, downloadFile, downloadAll, baseName } = useGeneratorStore(
    useShallow((s) => ({ generatedFiles: s.generatedFiles, downloadFile: s.downloadFile, downloadAll: s.downloadAll, baseName: s.baseName })),
  );
  const isSampleData = useDataStore((s) => s.isSampleData);
  const hasTemplate = useEditorStore((e) => e.rawDocxBytes !== null && e.placeholders.length > 0);
  const hasSpreadsheet = useDataStore((d) => d.rawXlsxBytes !== null);
  const pdfOn = getConvertApiUrl() !== null;
  const pdfPhase = usePdfStore((s) => s.phase);
  const count = generatedFiles.length;
  const realRun = count > 0 && !isSampleData;

  // Read once per mount: donors are thanked instead of asked; after a recent
  // "No thanks" the dialog stays away but the quiet line remains.
  const [donor] = useState(isRecentDonor);
  const [declinedRecently] = useState(isRecentlyDeclined);

  // Re-render after a download; the run's downloads live in runDownloads.
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const savedCount = savedCountOf(generatedFiles, count);
  const downloaded = savedCount > 0;
  const lastDownload = downloadsFor(generatedFiles).last;
  // Until every document has been downloaded, losing them asks first.
  const protect = realRun && savedCount < count;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<string>('word');
  const [modalDone, setModalDone] = useState(() => modalOpenedForRun.run === generatedFiles);
  const [askExpanded, setAskExpanded] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState<null | 'new' | 'same'>(null);
  const confirmText = savedCount > 0 ? t('done.confirm.textSome') : tCount(count, 'done.confirm.text');

  // The documents exist only in this tab: the saved session was cleared when
  // generation finished. Until every document has been downloaded, closing or
  // reloading the tab asks first (audit finding 3), and so does leaving inside
  // the app: the editor's router blocker asks with the same text.
  useEffect(() => {
    if (!protect) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [protect]);
  useEffect(() => {
    useDoneGuard.getState().setMessage(protect ? confirmText : null);
    return () => useDoneGuard.getState().setMessage(null);
  }, [protect, confirmText]);

  // Generation has just ended: the progress dialog and its Cancel button are
  // gone. Focus the heading ("24 documents generated") once per run, so focus
  // is not lost and a screen reader announces the result (WCAG 2.4.3, 4.1.3).
  // No cleanup on purpose: StrictMode's second mount must not cancel it.
  useEffect(() => {
    if (count === 0 || headingFocusedRuns.has(generatedFiles)) return;
    headingFocusedRuns.add(generatedFiles);
    focusAfterDialog(() => document.querySelector<HTMLElement>('[data-done-heading]'));
  }, [count, generatedFiles]);

  const markDownloaded = useCallback((kind: DownloadKind, stem?: string) => {
    const d = downloadsFor(generatedFiles);
    if (kind === 'file') { if (stem !== undefined) d.singles.add(stem); } else d.set = true;
    d.last = kind;
    bump();
  }, [generatedFiles]);

  const maybeShowModal = useCallback((source: DownloadKind) => {
    if (!realRun || donor || declinedRecently || ASK_AFTER_DOWNLOAD !== 'modal') return;
    if (modalOpenedForRun.run === generatedFiles) return; // once per run, whatever the kind
    modalOpenedForRun.run = generatedFiles;
    setModalSource(source);
    setModalOpen(true);
  }, [realRun, donor, declinedRecently, generatedFiles]);

  const closeModal = useCallback((method: DismissMethod) => {
    setModalOpen(false);
    setModalDone(true);
    trackEvent('donation_ask_dismissed', { method, surface: 'modal' });
    if (method === 'no_thanks') rememberDecline();
  }, []);
  // Checkout opened in a new tab from the dialog: the dialog has done its job.
  // It closes without a dismissal event (nobody declined), and the quiet line
  // takes its place (review b, finding 9).
  const closeModalAfterCheckout = useCallback(() => {
    setModalOpen(false);
    setModalDone(true);
  }, []);

  const fileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFileTimer = useCallback(() => {
    if (fileTimer.current !== null) { clearTimeout(fileTimer.current); fileTimer.current = null; }
  }, []);
  useEffect(() => clearFileTimer, [clearFileTimer]);

  const handleWordDownload = useCallback(async () => {
    await downloadAll();
    clearFileTimer();
    markDownloaded('word');
    maybeShowModal('word');
  }, [downloadAll, clearFileTimer, markDownloaded, maybeShowModal]);
  const handlePdfAfterDownload = useCallback(() => {
    clearFileTimer();
    markDownloaded('pdf');
    maybeShowModal('pdf');
  }, [clearFileTimer, markDownloaded, maybeShowModal]);
  const noteSingleDownload = useCallback((stem: string) => {
    markDownloaded('file', stem);
    clearFileTimer();
    fileTimer.current = setTimeout(() => { fileTimer.current = null; maybeShowModal('file'); }, FILE_MODAL_DELAY_MS);
  }, [clearFileTimer, markDownloaded, maybeShowModal]);
  const handleFileDownload = useCallback((index: number) => {
    downloadFile(index);
    noteSingleDownload(generatedFiles[index]?.stem ?? String(index));
  }, [downloadFile, noteSingleDownload, generatedFiles]);
  const handleFileDownloadByStem = useCallback((stem: string) => {
    const index = generatedFiles.findIndex((f) => f.stem === stem);
    if (index >= 0) handleFileDownload(index);
  }, [generatedFiles, handleFileDownload]);

  const navigate = useNavigate();
  // `downloaded` in start_over means every document was saved first.
  const startNew = useCallback(() => {
    trackEvent('start_over', { downloaded: savedCountOf(generatedFiles, count) >= count, keep: 'none' });
    useDoneGuard.getState().setMessage(null);
    useEditorStore.getState().reset(); useDataStore.getState().reset();
    useGeneratorStore.getState().reset(); navigate('/editor');
  }, [navigate, generatedFiles, count]);
  // From the end of a sample run to the person's own files: the same move as
  // "Use my files" in the sample banner, so the same event (review b, 17).
  const useOwnFiles = useCallback(() => {
    trackEvent('instant_preview_swapped');
    useEditorStore.getState().reset(); useDataStore.getState().reset();
    useGeneratorStore.getState().reset(); navigate('/editor');
  }, [navigate]);
  // Same template, new spreadsheet: the marked fields stay, the data step opens.
  const startSameTemplate = useCallback(() => {
    trackEvent('start_over', { downloaded: savedCountOf(generatedFiles, count) >= count, keep: 'template' });
    useDoneGuard.getState().setMessage(null);
    useGeneratorStore.getState().reset();
    const d = useDataStore.getState();
    d.reset(); d.setPhase('excelUpload'); d.setDataSubState('upload');
  }, [generatedFiles, count]);
  const requestStart = useCallback((which: 'new' | 'same') => {
    if (realRun && savedCountOf(generatedFiles, count) < count) { setConfirmDiscard(which); return; }
    if (which === 'new') startNew(); else startSameTemplate();
  }, [realRun, generatedFiles, count, startNew, startSameTemplate]);
  // "Keep them" puts focus back on the button that asked (WCAG 2.4.3).
  const newBtnRef = useRef<HTMLButtonElement>(null);
  const sameBtnRef = useRef<HTMLButtonElement>(null);
  const keepFocus = useRef<null | 'new' | 'same'>(null);
  const keepThem = useCallback(() => { keepFocus.current = confirmDiscard; setConfirmDiscard(null); }, [confirmDiscard]);
  useEffect(() => {
    if (confirmDiscard !== null || keepFocus.current === null) return;
    (keepFocus.current === 'same' ? sameBtnRef : newBtnRef).current?.focus();
    keepFocus.current = null;
  }, [confirmDiscard]);

  // "Try Demo Again" from the demo's last screen: a full page load, like
  // "Start with My Template", because a link to the route already mounted
  // would not start the demo again (review b, finding 3).
  const handleRestartDemo = useCallback(() => {
    useEditorStore.getState().reset(); useDataStore.getState().reset();
    useGeneratorStore.getState().reset(); window.location.assign('/editor?flow=exploring');
  }, []);
  const handleStartTemplate = useCallback(() => {
    useEditorStore.getState().reset(); useDataStore.getState().reset();
    useGeneratorStore.getState().reset(); window.location.assign('/editor?flow=template-data');
  }, []);

  if (isDemo) {
    return (
      <div className={s.root}>
        <div className={s.successIcon}>
          <Checkmark28Regular />
        </div>
        <h1 className={s.title} data-done-heading tabIndex={-1}>{tCount(count, 'demo.complete.title')}</h1>
        <div className={s.demoSubtitle}>{t('demo.complete.subtitle')}</div>
        <button type="button" className={s.demoCta} onClick={handleStartTemplate}>
          {t('demo.cta.button')}
        </button>
        <div className={s.demoSecondary}>
          <button type="button" className={s.btnGhost} onClick={() => downloadAll()}>
            {t('demo.secondary.download')}
          </button>
          <button type="button" className={s.btnGhost} onClick={handleRestartDemo}>
            {t('demo.secondary.restart')}
          </button>
        </div>
      </div>
    );
  }

  const consent = pdfPhase === 'consent';

  // The donation ask, in one place per state. Never on sample data, never on
  // the PDF consent gate.
  const donorThanks = realRun && !consent && donor && (
    <div className={s.quietAsk}>
      <span>{t('done.ask.donor')}</span>
      {!askExpanded && <button type="button" className={s.quietBtn} onClick={() => setAskExpanded(true)}>{t('done.ask.again')}</button>}
    </div>
  );
  // After the first download: the dialog carried the ask, or recently declined.
  const quietAfter = realRun && !consent && !donor && downloaded && !modalOpen
    && (ASK_AFTER_DOWNLOAD === 'modal' ? (modalDone || declinedRecently) : declinedRecently);
  const quietLine = quietAfter && !askExpanded && (
    <div className={s.quietAsk}>
      <span>{t('done.ask.quiet')}</span>
      <button type="button" className={s.quietBtn} onClick={() => setAskExpanded(true)}>{t('done.ask.show')}</button>
    </div>
  );
  // Inline variant under test: the card itself moves up after the download.
  const cardTop = realRun && !consent && !donor && downloaded && ASK_AFTER_DOWNLOAD === 'inline' && !declinedRecently;
  const cardExpanded = realRun && !consent && askExpanded;
  // Before any download the card sits below the files, as today.
  const cardBelow = realRun && !consent && !donor && !downloaded && !declinedRecently;
  // Opened by "Support Veidne" or "Give again", the card takes the place of
  // the button just pressed, so focus moves to its heading (WCAG 2.4.3).
  const donateCard = <DonateInline count={count} runKey={generatedFiles} surface="inline" focusHeading={askExpanded} />;

  // The status element is in the page from the first render and only its
  // text changes, so screen readers announce it (WCAG 4.1.3). Empty, it is
  // visually hidden and takes no space in the column.
  const savedText = realRun && downloaded && lastDownload
    ? (lastDownload === 'word' ? t('done.saved.word', { file: `${baseName || 'documents'}.zip`, count: tCount(count, 'count.wordFiles') })
      : lastDownload === 'pdf' ? t('done.saved.pdf')
        : t('done.saved.file'))
    : '';
  const savedNotice = realRun && !consent && (
    <p className={savedText ? s.saved : s.srOnly} role="status">
      {savedText && <CheckmarkCircle20Regular aria-hidden="true" />}
      {savedText}
    </p>
  );

  // Asked after the files are saved, the same way for everyone.
  const feedback = realRun && downloaded && !consent && <FeedbackAsk runKey={generatedFiles} />;

  const sampleNext = isSampleData && count > 0 && !consent && (
    <div className={s.sampleNext}>
      <p className={s.sampleText}>{t('done.sample.text')}</p>
      <button type="button" className={s.btnPrimary} onClick={useOwnFiles}>{t('done.sample.cta')}</button>
    </div>
  );

  // A sample run has its own next step ("Use my files" above); "Next time"
  // would only repeat it (review b, finding 25).
  const nextTime = !consent && count > 0 && !isSampleData && (
    <section className={s.nextTime} aria-labelledby="done-next-time">
      <h2 id="done-next-time" className={s.nextTitle}>{t('done.next.title')}</h2>
      {hasTemplate && !isSampleData && (
        <p className={s.nextText}>
          <button type="button" className={s.sourceLink} onClick={() => downloadTaggedTemplate('done')}>
            {t('done.next.template')}
          </button>{' '}{t('done.next.templateWhy')}
          {hasSpreadsheet && (<>{' '}<button type="button" className={s.sourceLink} onClick={() => downloadUploadedSpreadsheet('done')}>{t('done.sourceFiles.xlsx')}</button></>)}
        </p>
      )}
      {confirmDiscard ? (
        <div className={s.confirm} role="alertdialog" aria-labelledby="done-confirm-text">
          <p id="done-confirm-text" className={s.confirmText}>{confirmText}</p>
          <div className={s.actions}>
            <button type="button" className={s.btnDanger} onClick={() => (confirmDiscard === 'new' ? startNew() : startSameTemplate())}>
              {tCount(count - savedCount, 'done.confirm.discard')}
            </button>
            <button type="button" className={s.btnGhost} onClick={keepThem} autoFocus>{t('done.confirm.keep')}</button>
          </div>
        </div>
      ) : (
        <div className={s.actions}>
          {hasTemplate && !isSampleData && (
            <button type="button" ref={sameBtnRef} className={s.btnGhost} onClick={() => requestStart('same')}>{t('done.next.same')}</button>
          )}
          <button type="button" ref={newBtnRef} className={s.btnGhost} onClick={() => requestStart('new')}>{t('done.next.new')}</button>
        </div>
      )}
    </section>
  );

  const modal = (
    <DownloadCompleteModal open={modalOpen} onClose={closeModal} onCheckoutOpened={closeModalAfterCheckout}
      source={modalSource} count={count} savedCount={savedCount} runKey={generatedFiles} />
  );

  const header = (
    <>
      <div className={s.successIcon}>
        <Checkmark28Regular />
      </div>
      <h1 className={s.title} data-done-heading tabIndex={-1}>{tCount(count, 'done.title')}</h1>
      {(!realRun || protect) && (
        <div className={s.subtitle}>{realRun ? t('done.subtitle.notYet') : t('done.subtitle')}</div>
      )}
    </>
  );

  // Order after the first download: saved notice, the donation ask (one line
  // or, in the inline variant, the card), the feedback question, then the
  // download area and the reuse section. Before it: the download area first,
  // the donation card under the files, the reuse section last.
  const top = (
    <>
      {savedNotice}
      {sampleNext}
      {donorThanks}
      {quietLine}
      {(cardTop || (cardExpanded && downloaded)) && donateCard}
      {feedback}
    </>
  );
  const bottomAsk = (cardBelow || (cardExpanded && !downloaded)) && donateCard;

  if (pdfOn) {
    const showFraming = pdfPhase === 'idle';
    return (
      <div className={mergeClasses(s.root, s.rootScroll)}>
        <div className={s.content}>
          {showFraming && header}
          {top}
          <PdfFlow files={generatedFiles} baseName={baseName}
            onDownloadWord={() => void handleWordDownload()} onAfterDownload={handlePdfAfterDownload}
            onDownloadFile={handleFileDownloadByStem} onAfterFileDownload={noteSingleDownload} />
          {bottomAsk}
          {nextTime}
        </div>
        {modal}
      </div>
    );
  }

  return (
    <div className={mergeClasses(s.root, s.rootScroll)}>
      <div className={s.content}>
        {header}
        {top}
        <FileList files={generatedFiles} onDownloadFile={handleFileDownload} />
        <div className={s.actions}>
          <button type="button" className={s.btnPrimary} onClick={() => void handleWordDownload()}>
            {t('done.downloadAll')}
          </button>
        </div>
        {bottomAsk}
        {nextTime}
      </div>
      {modal}
    </div>
  );
}
