import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import type { PdfFile } from '@/features/generator/store/pdfStore';
import { FileStatusRow } from '../FileStatusRow';
import { useStyles } from './FileStatusList.styles';

// 8 or fewer files renders flat; above 8 gets the collapsible scroll panel.
const COLLAPSE_THRESHOLD = 8;

interface FileStatusListProps {
  files: PdfFile[];
  /** True while the batch is converting: the window follows the frontier (part 5). */
  following?: boolean;
  /** False on the Done entry, so files list with no per-row status until the
   *  conversion starts (F8). */
  showStatus?: boolean;
  /** Single-file download for a row, by stem; rows are inert without it. */
  onDownloadFile?: (stem: string) => void;
  /** Word file sizes by stem, shown in grey on the row when known. */
  sizeByStem?: Map<string, number>;
  /** Single-file PDF download for a finished row, by stem. */
  onDownloadPdf?: (stem: string) => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FileStatusList({ files, following = false, showStatus = true, onDownloadFile, sizeByStem, onDownloadPdf }: FileStatusListProps) {
  const s = useStyles();
  // Expanded by default, always (part 5).
  const [collapsed, setCollapsed] = useState(false);
  // Follow scroll (part 5): the window keeps the frontier visible while
  // converting. If the user scrolls, following pauses and the Jump to current
  // pill appears; clicking it (or leaving converting) resumes.
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Entering a new converting session clears any pause from the previous run, so
  // following starts fresh. Adjusting state during render when a prop changes,
  // tracking the previous value in state, is the sanctioned React pattern (no
  // effect, no ref-in-render).
  const [wasFollowing, setWasFollowing] = useState(following);
  if (wasFollowing !== following) {
    setWasFollowing(following);
    if (following) setPaused(false);
  }

  // The frontier is the first converting row, falling back to the first waiting
  // row. Tracking its index lets the follow effect fire only when it moves.
  const frontierIndex = useMemo(() => {
    const converting = files.findIndex((f) => f.status === 'converting');
    if (converting !== -1) return converting;
    return files.findIndex((f) => f.status === 'waiting');
  }, [files]);

  // Scroll so the frontier row sits about two rows from the top. Programmatic
  // (no wheel/touch event), so it never trips the user-scroll pause below. Under
  // reduced motion the jump is instant (part 5 / part 10).
  const scrollToFrontier = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const frontier = el.querySelector(
      '[data-status="converting"], [data-status="waiting"]',
    ) as HTMLElement | null;
    if (!frontier) return;
    const elRect = el.getBoundingClientRect();
    const rowRect = frontier.getBoundingClientRect();
    const top = el.scrollTop + (rowRect.top - elRect.top) - 2 * rowRect.height;
    el.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  // Follow the frontier while converting and not paused; re-fires when the
  // frontier advances or following resumes.
  useEffect(() => {
    if (!following || paused) return;
    scrollToFrontier();
  }, [following, paused, frontierIndex, scrollToFrontier]);

  // A real user scroll (wheel or touch drag) pauses following. Programmatic
  // scrollTo emits neither event, so it is cleanly distinguished.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !following) return;
    const onIntent = () => setPaused(true);
    el.addEventListener('wheel', onIntent, { passive: true });
    el.addEventListener('touchmove', onIntent, { passive: true });
    return () => {
      el.removeEventListener('wheel', onIntent);
      el.removeEventListener('touchmove', onIntent);
    };
  }, [following, collapsed]);

  // Generation order, top to bottom. Stems are unique (deduped), so they are
  // stable React keys; the order never changes mid-run.
  const rows = files.map((f) => <FileStatusRow key={f.stem} stem={f.stem} status={f.status} showStatus={showStatus} size={sizeByStem?.get(f.stem)} onDownload={onDownloadFile} onDownloadPdf={onDownloadPdf} />);

  if (files.length <= COLLAPSE_THRESHOLD) {
    return (
      <div className={s.panel} data-testid="pdf-files" data-variant="flat">
        <ul className={s.list}>{rows}</ul>
      </div>
    );
  }

  return (
    <div className={s.panel} data-testid="pdf-files" data-variant="panel">
      <div className={mergeClasses(s.head, collapsed && s.headCollapsed)}>
        <span className={s.title}>
          {t('pdf.files.title')} <span className={s.count}>({files.length})</span>
        </span>
        <button type="button" className={s.toggle} data-testid="pdf-files-toggle" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? t('pdf.files.show', { count: String(files.length) }) : t('pdf.files.hide')}
        </button>
      </div>
      {!collapsed && (
        <div className={s.scroll} data-testid="pdf-files-scroll" ref={scrollRef}>
          <ul className={s.list}>{rows}</ul>
        </div>
      )}
      {following && paused && !collapsed && (
        <button
          type="button"
          data-testid="pdf-jump"
          className={s.jump}
          onClick={() => setPaused(false)}
        >
          {t('pdf.files.jump')}
        </button>
      )}
    </div>
  );
}
