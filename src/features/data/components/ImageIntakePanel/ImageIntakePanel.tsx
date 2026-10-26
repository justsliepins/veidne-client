import { useRef, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import JSZip from 'jszip';
import { ImageRegular, CheckmarkCircle16Regular, ChevronRight16Regular, ChevronDown16Regular } from '@fluentui/react-icons';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { coverageLine } from '../../utils/imageCoverage';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { trackEvent } from '@/services/analyticsService';
import { useDataStore } from '../../store/dataStore';
import { useEditorStore } from '@/features/editor/store/editorStore';
import {
  isImageFileName, isRejectedFileName, matchImageField, unreferencedFiles,
} from '../../utils/imageMatch';
import { useStyles } from './ImageIntakePanel.styles';
import { features } from '@/config/features';

type Via = 'files' | 'folder' | 'zip';

/** Read a dropped directory tree (webkitGetAsEntry) into flat files. */
async function readEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    await new Promise<void>((resolve) => {
      (entry as FileSystemFileEntry).file((f) => { out.push(f); resolve(); }, () => resolve());
    });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries((es) => resolve(es), () => resolve([]));
    });
    for (const e of entries) await readEntry(e, out);
  }
}

/** Flatten a .zip into image files by bare file name (nested folders ignored). */
async function expandZip(file: File): Promise<{ name: string; blob: Blob }[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const out: { name: string; blob: Blob }[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const name = path.split('/').pop()!;
    if (!isImageFileName(name)) continue;
    out.push({ name, blob: await entry.async('blob') });
  }
  return out;
}

interface ImageIntakePanelProps {
  // On the guided Pictures step choosing images is the one obvious action, so
  // the button is the filled primary; elsewhere (the bridge, the data screen,
  // the rail) the spreadsheet is the primary and this stays a quiet secondary.
  chooseAppearance?: 'primary' | 'secondary';
}

/** Picture intake and per-row match panel. Rendered only when the template
 *  has at least one image field; without one the Data step is unchanged. */
export function ImageIntakePanel({ chooseAppearance = 'secondary' }: ImageIntakePanelProps = {}) {
  const s = useStyles();
  const placeholders = useEditorStore((st) => st.placeholders);
  const { rows, columnMapping, imageFiles, imageResolutions, addImageFiles, setImageResolution } = useDataStore(
    useShallow((st) => ({
      rows: st.rows, columnMapping: st.columnMapping,
      imageFiles: st.imageFiles, imageResolutions: st.imageResolutions,
      addImageFiles: st.addImageFiles, setImageResolution: st.setImageResolution,
    })),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Once pictures exist the card collapses: drop zone hidden behind the
  // Add more images button until explicitly reopened.
  const [dropReopened, setDropReopened] = useState(false);
  // Before any spreadsheet the card sits pre-collapsed to its heading line so
  // the spreadsheet upload stays the focus of the Data step (F10); the heading
  // is a toggle that expands it. Once pictures or rows exist it is always open.
  const [expanded, setExpanded] = useState(false);

  const imageFields = placeholders.filter((p) => p.type === 'image');

  const results = useMemo(
    () => imageFields.map((f) => matchImageField(f.name, columnMapping, rows, imageFiles.keys(), imageResolutions)),
    [imageFields, columnMapping, rows, imageFiles, imageResolutions],
  );
  const unused = useMemo(() => unreferencedFiles(imageFiles.keys(), results), [imageFiles, results]);

  // Dark launch: without the flag no image field can exist, but gate
  // explicitly so the card is structurally impossible when off.
  if (!features.imagePlaceholders || imageFields.length === 0) return null;

  const MAX_PICTURE_BYTES = 25 * 1024 * 1024;

  const ingest = (files: File[], via: Via) => {
    setError(null);
    if (files.some((f) => isRejectedFileName(f.name))) {
      setError(t('imageIntake.heicRejected'));
    }
    const oversized = files.find((f) => isImageFileName(f.name) && f.size > MAX_PICTURE_BYTES);
    if (oversized) {
      setError(t('imageIntake.tooLarge', { name: oversized.name }));
    }
    const accepted = files.filter((f) => isImageFileName(f.name) && f.size <= MAX_PICTURE_BYTES)
      .map((f) => ({ name: f.name, blob: f as Blob }));
    finishIngest(accepted, via);
  };

  const finishIngest = (accepted: { name: string; blob: Blob }[], via: Via) => {
    if (accepted.length === 0) return;
    addImageFiles(accepted);
    setDropReopened(false);
    trackEvent('images_added', { count: accepted.length, via });

    // Recompute against the freshly merged store for honest match numbers.
    const st = useDataStore.getState();
    const fresh = imageFields.map((f) => matchImageField(f.name, st.columnMapping, st.rows, st.imageFiles.keys(), st.imageResolutions));
    const matched = fresh.reduce((n, r) => n + r.matchedCount, 0);
    const unmatched = fresh.reduce((n, r) => n + r.unmatchedRows.length, 0);
    trackEvent('image_match', { matched, unmatched, unused: unreferencedFiles(st.imageFiles.keys(), fresh).length });
  };

  const handleFiles = async (files: File[], via: Via) => {
    const zips = files.filter((f) => f.name.toLowerCase().endsWith('.zip'));
    const plain = files.filter((f) => !f.name.toLowerCase().endsWith('.zip'));
    if (plain.length) ingest(plain, via);
    for (const z of zips) {
      try {
        finishIngest(await expandZip(z), 'zip');
      } catch { /* not a readable zip: ignore */ }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items ?? []);
    const entries = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
    const hasDir = entries.some((en) => en.isDirectory);
    if (hasDir) {
      const collected: File[] = [];
      for (const en of entries) await readEntry(en, collected);
      await handleFiles(collected, 'folder');
    } else {
      await handleFiles(Array.from(e.dataTransfer.files), 'files');
    }
  };

  const heading = imageFields.length === 1
    ? t('imageIntake.heading.single', { name: imageFields[0].name })
    : t('imageIntake.heading.multi');
  const totalRows = rows.length;
  const matchedTotal = results.length ? Math.min(...results.map((r) => r.matchedCount)) : 0;

  // Collapsible only before there is anything to show (no spreadsheet, no
  // pictures yet); after either exists the body always stays open.
  const canCollapse = totalRows === 0 && imageFiles.size === 0;
  const bodyShown = !canCollapse || expanded;

  return (
    <div className={s.card} data-testid="image-intake">
      {canCollapse ? (
        <button type="button" className={mergeClasses(s.heading, s.headingToggle)}
          data-testid="image-intake-toggle" aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}>
          <ImageRegular className={s.headingIcon} />
          <span className={s.headingText}>{heading}</span>
          {expanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
        </button>
      ) : (
        <div className={s.heading}>
          <ImageRegular className={s.headingIcon} />
          {heading}
        </div>
      )}

      {/* The hidden picker stays mounted even while collapsed so a chosen file is
          always handled; the visible drop zone and Choose images live in the body. */}
      <input ref={inputRef} type="file" multiple hidden data-testid="image-intake-input"
        accept=".jpg,.jpeg,.png,.webp,.gif,.zip,.heic,.heif"
        onChange={(e) => { void handleFiles(Array.from(e.target.files ?? []), 'files'); e.target.value = ''; }} />

      {bodyShown && <>
      {(imageFiles.size === 0 || dropReopened) ? (
        <div className={s.dropZone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}>
          <div className={s.dropCopy}>{t('imageIntake.dropCopy')}</div>
          <VeidneButton appearance={chooseAppearance} onClick={() => inputRef.current?.click()}>
            {t('imageIntake.chooseButton')}
          </VeidneButton>
          <div className={s.subline}>{t('imageIntake.subline', { name: imageFields[0].name })}</div>
          <div className={s.subline}>{t('privacy.local')}</div>
        </div>
      ) : (
        <div className={s.collapsedRow} data-testid="image-intake-collapsed">
          <CheckmarkCircle16Regular className={s.collapsedCheck} />
          <span className={s.collapsedText}>{tCount(imageFiles.size, 'count.picturesAdded')}</span>
          <VeidneButton appearance="secondary" size="small" onClick={() => setDropReopened(true)}>
            {t('imageIntake.addMore')}
          </VeidneButton>
        </div>
      )}

      {error && <div className={s.error} role="alert">{error}</div>}

      {totalRows > 0 && imageFiles.size > 0 && (
        <div className={s.matchPanel} data-testid="image-match-panel">
          <div className={s.summary}>{coverageLine(matchedTotal, totalRows)}</div>

          {results.map((r) => r.unmatchedRows.map((row) => (
            <div key={`${r.field}-${row.rowIndex}`} className={s.unmatchedRow}>
              <span className={s.unmatchedText}>
                {t('imageIntake.unmatchedRow', { row: String(row.rowIndex + 1), cell: row.cell || '(empty)' })}
              </span>
              <select className={s.resolutionSelect}
                aria-label={t('imageIntake.useDifferentFile')}
                value={imageResolutions[`${r.field} ${row.rowIndex}`] ?? '__unset'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v !== '__unset') setImageResolution(r.field, row.rowIndex, v);
                }}>
                <option value="__unset" disabled>{t('imageIntake.useDifferentFile')}</option>
                {[...imageFiles.keys()].map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="">{t('imageIntake.generateWithout')}</option>
              </select>
            </div>
          )))}

          {unused.length > 0 && (
            <div className={s.unreferenced}>
              {tCount(unused.length, 'imageIntake.unreferenced')}
            </div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}
