import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { mergeClasses } from '@fluentui/react-components';
import { Checkmark28Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { getConvertApiUrl } from '@/services/pdfConversion';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';
import { useGeneratorStore } from '../../store/generatorStore';
import { downloadTaggedTemplate, downloadUploadedSpreadsheet } from '../../utils/sourceFiles';
import { rollFileModal } from '../../utils/fileModalRoll';
import { usePdfStore } from '../../store/pdfStore';
import { DonateInline } from '@/features/donation/components/DonateInline';
import { ReviewAsk } from '@/features/donation/components/ReviewAsk';
import { DownloadCompleteModal } from '@/features/donation/components/DownloadCompleteModal';
import { FileList } from '../../components/FileList';
import { PdfFlow } from '../../components/PdfFlow';
import { useStyles } from './DoneView.styles';

interface DoneViewProps {
  isDemo?: boolean;
}

// Whether the user has already had the full review card on screen. The
// condensed one-line ask shows under the download actions on every real run;
// the full card additionally shows below the donate card until it has actually
// been seen once, which ReviewAsk's visibility observer reports. localStorage
// can throw in private mode, so every access is guarded; any failure means
// "not seen" (show the full card) and we simply skip writing.
const SUPPORT_ASK_KEY = 'veidne_supportAskSeen';
const SUPPORT_ASK_VALUE = '1';

function isSupportAskSeen(): boolean {
  try {
    return localStorage.getItem(SUPPORT_ASK_KEY) === SUPPORT_ASK_VALUE;
  } catch {
    return false;
  }
}

function rememberSupportAskSeen(): void {
  try {
    localStorage.setItem(SUPPORT_ASK_KEY, SUPPORT_ASK_VALUE);
  } catch {
    /* private mode or storage full: proceed without remembering */
  }
}

// Quiet time after a single-file download before the modal may open, so a
// file-by-file run is never interrupted mid-way.
const FILE_MODAL_DELAY_MS = 4000;
// Chance that one single-file download opens the modal. Bulk and PDF
// downloads open it every time; a file from the list is a smaller moment.
const FILE_MODAL_CHANCE = 0.1;

export function DoneView({ isDemo }: DoneViewProps) {
  const s = useStyles();
  const { generatedFiles, downloadFile, downloadAll, baseName } = useGeneratorStore(
    useShallow((s) => ({ generatedFiles: s.generatedFiles, downloadFile: s.downloadFile, downloadAll: s.downloadAll, baseName: s.baseName })),
  );
  const isSampleData = useDataStore((s) => s.isSampleData);
  // The user's own files, offered back. The saved session is already cleared
  // by the time this screen shows, so this row is the last way to keep the
  // tagged template. The spreadsheet is offered only while its uploaded bytes
  // are still held (never rebuilt from the parsed rows).
  const hasTemplate = useEditorStore((e) => e.rawDocxBytes !== null && e.placeholders.length > 0);
  const hasSpreadsheet = useDataStore((d) => d.rawXlsxBytes !== null);
  // PDF feature gate: null converter URL means render zero new UI (today's app).
  const pdfOn = getConvertApiUrl() !== null;
  const pdfPhase = usePdfStore((s) => s.phase);
  // Read once at mount: until the full review card has been seen once, a real
  // completion shows it below the donate card. Written only when the card has
  // actually been on screen, so a visitor who never scrolled down still gets
  // it next time.
  const [fullCardSeen] = useState(isSupportAskSeen);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadModalSource, setDownloadModalSource] = useState('word');
  // The run the modal has opened for, if any. While it matches the current run
  // the inline donate card stays hidden, so there is only ever one ask on
  // screen: the modal while open, nothing afterwards.
  const [modalShownForRun, setModalShownForRun] = useState<object | null>(null);
  // Open the post-download modal for real runs only (never sample or demo
  // data). No cap: the bulk and PDF downloads open it every time they finish.
  // The inline ReviewAsk remains available either way.
  const maybeShowDownloadModal = useCallback((source: string) => {
    if (isSampleData || generatedFiles.length === 0) return;
    setModalShownForRun(generatedFiles);
    setDownloadModalSource(source);
    setDownloadModalOpen(true);
  }, [isSampleData, generatedFiles]);
  // Timer for the single-file case below; bulk and PDF downloads clear it.
  const fileModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileModalArmed = useRef(false);
  const clearFileModalTimer = useCallback(() => {
    if (fileModalTimer.current !== null) {
      clearTimeout(fileModalTimer.current);
      fileModalTimer.current = null;
    }
  }, []);
  useEffect(() => clearFileModalTimer, [clearFileModalTimer]);
  // The download always runs first; the modal is opened only afterwards. For the
  // async zip download we await the save before showing, so the modal never
  // delays or blocks the download.
  const handleWordDownload = useCallback(async () => {
    await downloadAll();
    clearFileModalTimer();
    fileModalArmed.current = false;
    maybeShowDownloadModal('word');
  }, [downloadAll, clearFileModalTimer, maybeShowDownloadModal]);
  const handlePdfAfterDownload = useCallback(() => {
    clearFileModalTimer();
    fileModalArmed.current = false;
    maybeShowDownloadModal('pdf');
  }, [clearFileModalTimer, maybeShowDownloadModal]);
  // A single file from the list: each download rolls a 10 percent chance. A
  // win arms the modal, but someone saving seven files one by one must never
  // get it over the list mid-task, so every further download in the sequence
  // resets a short timer and the modal opens only once downloads have stopped.
  // The bulk and PDF downloads above open it at once, since nothing is left to
  // do after them.
  const noteSingleDownload = useCallback(() => {
    clearFileModalTimer();
    if (rollFileModal(FILE_MODAL_CHANCE)) fileModalArmed.current = true;
    if (!fileModalArmed.current) return;
    fileModalTimer.current = setTimeout(() => {
      fileModalTimer.current = null;
      fileModalArmed.current = false;
      maybeShowDownloadModal('file');
    }, FILE_MODAL_DELAY_MS);
  }, [clearFileModalTimer, maybeShowDownloadModal]);
  const handleFileDownload = useCallback((index: number) => {
    downloadFile(index);
    noteSingleDownload();
  }, [downloadFile, noteSingleDownload]);
  // The PDF branch's rows name files by stem; same single-file path as above.
  const handleFileDownloadByStem = useCallback((stem: string) => {
    const index = generatedFiles.findIndex((f) => f.stem === stem);
    if (index >= 0) handleFileDownload(index);
  }, [generatedFiles, handleFileDownload]);
  const navigate = useNavigate();
  const handleStartOver = useCallback(() => {
    useEditorStore.getState().reset(); useDataStore.getState().reset();
    useGeneratorStore.getState().reset(); navigate('/editor');
  }, [navigate]);
  const handleRestartDemo = useCallback(() => {
    useEditorStore.getState().reset(); useDataStore.getState().reset();
    useGeneratorStore.getState().reset(); navigate('/editor?flow=exploring');
  }, [navigate]);
  const handleStartTemplate = useCallback(() => {
    useEditorStore.getState().reset(); useDataStore.getState().reset();
    useGeneratorStore.getState().reset(); window.location.assign('/editor?flow=template-data');
  }, []);

  // The inline donation ask on this screen. It needs a run with files (never
  // the stale-phase remount, whose store is reset to zero files), a sample run
  // (instant preview) gets none, nothing is asked while the PDF consent gate is
  // up, and once the post-download modal has carried the ask for this run the
  // card stays hidden.
  const showAsk = generatedFiles.length > 0 && !isSampleData && pdfPhase !== 'consent'
    && modalShownForRun !== generatedFiles;
  // The review ask follows the same real-run rule as the donate card (a run
  // with files, never sample data, never on the consent gate). The condensed
  // line sits directly under the download actions, inside the first screen,
  // on every run; the full card sits below the donate card until it has been
  // seen once. The modal does not hide either: once it has carried the
  // donation ask, the review line is the one ask left on the page.
  const showReview = generatedFiles.length > 0 && !isSampleData && pdfPhase !== 'consent';
  const reviewLine = showReview && <ReviewAsk condensed runKey={generatedFiles} />;
  const reviewCard = showReview && !fullCardSeen
    && <ReviewAsk condensed={false} runKey={generatedFiles} onSeen={rememberSupportAskSeen} />;
  const showSourceFiles = hasTemplate && !isSampleData && pdfPhase !== 'consent';
  const sourceFiles = showSourceFiles && (
    <div className={s.sourceRow}>
      <span className={s.sourceLabel}>{t('done.sourceFiles.title')}</span>
      <button type="button" className={s.sourceLink} onClick={() => downloadTaggedTemplate('done')}>
        {t('done.sourceFiles.docx')}
      </button>
      {hasSpreadsheet && (
        <button type="button" className={s.sourceLink} onClick={() => downloadUploadedSpreadsheet('done')}>
          {t('done.sourceFiles.xlsx')}
        </button>
      )}
    </div>
  );

  if (isDemo) {
    return (
      <div className={s.root}>
        <div className={s.successIcon}>
          <Checkmark28Regular />
        </div>
        <div className={s.title}>
          {tCount(generatedFiles.length, 'demo.complete.title')}
        </div>
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

  // PDF on: delegate the action/list region to PdfFlow. The Word "documents
  // ready" framing shows only while the PDF flow is at its entry; once a
  // conversion is sending/converting/done, PdfFlow owns the panel heading so the
  // surface reads as a single evolving panel (the wireframe contract).
  if (pdfOn) {
    // Only the idle entry shows the Word "documents ready" framing; every other
    // PDF phase (sending/queued/converting/done/busy/unreachable/canceled/failed)
    // owns its own heading or pill.
    const showFraming = pdfPhase === 'idle';
    return (
      <div className={mergeClasses(s.root, s.rootScroll)}>
        <div className={s.content}>
          {showFraming && (
            <>
              <div className={s.successIcon}>
                <Checkmark28Regular />
              </div>
              <div className={s.title}>{tCount(generatedFiles.length, 'done.title')}</div>
              <div className={s.subtitle}>{t('done.subtitle')}</div>
            </>
          )}
          <PdfFlow files={generatedFiles} baseName={baseName}
            onDownloadWord={() => void handleWordDownload()} onAfterDownload={handlePdfAfterDownload}
            onDownloadFile={handleFileDownloadByStem} onAfterFileDownload={noteSingleDownload} />
          {reviewLine}
          {sourceFiles}
          {/* The consent gate shows only its two decision buttons (Convert / Keep
              Word files); Start Over and the donate card are hidden there so the
              choice stays focused. The donate card sits below the downloads on
              every other phase of this real (non-demo) completion. */}
          {showAsk && <DonateInline count={generatedFiles.length} runKey={generatedFiles} surface="inline" />}
          {pdfPhase !== 'consent' && (
            <button type="button" className={s.btnGhost} onClick={handleStartOver}>
              {t('done.startOver')}
            </button>
          )}
          {/* The full review card sits below the donation card until seen once
              and follows its real-run rule, so it is hidden on the consent
              gate and on sample runs. */}
          {reviewCard}
        </div>
        <DownloadCompleteModal open={downloadModalOpen} onClose={() => setDownloadModalOpen(false)}
          source={downloadModalSource} count={generatedFiles.length} runKey={generatedFiles} />
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.successIcon}>
        <Checkmark28Regular />
      </div>
      <div className={s.title}>
        {tCount(generatedFiles.length, 'done.title')}
      </div>
      <div className={s.subtitle}>{t('done.subtitle')}</div>
      <FileList files={generatedFiles} onDownloadFile={handleFileDownload} />
      <div className={s.actions}>
        <button type="button" className={s.btnPrimary} onClick={() => void handleWordDownload()}>
          {t('done.downloadAll')}
        </button>
        <button type="button" className={s.btnGhost} onClick={handleStartOver}>
          {t('done.startOver')}
        </button>
      </div>
      {reviewLine}
      {sourceFiles}
      {showAsk && <DonateInline count={generatedFiles.length} runKey={generatedFiles} surface="inline" />}
      {reviewCard}
      <DownloadCompleteModal open={downloadModalOpen} onClose={() => setDownloadModalOpen(false)}
        source={downloadModalSource} count={generatedFiles.length} runKey={generatedFiles} />
    </div>
  );
}
