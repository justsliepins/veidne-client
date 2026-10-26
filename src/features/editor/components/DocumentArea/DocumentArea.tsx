import { useRef, useState, useMemo, useCallback, useEffect, type CSSProperties, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Info16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useEditorStore } from '../../store/editorStore';
import { getTokenRange, computePlaceholderCoverage, type TokenCoverage } from '../../store/editorHelpers';
import { useDataStore } from '@/features/data/store/dataStore';
import { useDemoStore, getDemoTargetTokens } from '@/features/demo/store/demoStore';
import type { WordToken } from '../../utils/types';
import { ClickableWord } from '../ClickableWord';
import { PlaceholderChip } from '../PlaceholderChip';
import { PlaceholderPopover } from '../PlaceholderPopover';
import { ImageFieldDialog } from '../ImageFieldDialog';
import { imageFieldNameFromDescr } from '../../utils/imageFieldXml';
import { PreviewFieldImage } from '../PreviewFieldImage';
import { features } from '@/config/features';
import { FilledValue } from '../FilledValue';
import { DocumentPaper } from '../DocumentPaper';
import { useStyles } from './DocumentArea.styles';

interface DocumentAreaProps {
  previewMode?: boolean;
  getFilledValue?: (placeholderName: string) => string;
  transitionBeat?: number;
}

// ── Block types for the document layout ─────────────────────────────────────

interface ParagraphBlock { type: 'paragraph'; tokens: WordToken[] }
interface PageBreakBlock { type: 'pageBreak'; token: WordToken }
interface HtmlBlock { type: 'html'; token: WordToken }
interface UnsupportedBlock { type: 'unsupported'; token: WordToken }
interface TableCell { row: number; col: number; rowSpan: number; colSpan: number; tokens: WordToken[] }
interface TableBlock { type: 'table'; tableId: string; colWidths?: number[]; cells: TableCell[] }

type DocBlock = ParagraphBlock | PageBreakBlock | HtmlBlock | UnsupportedBlock | TableBlock;

function buildBlocks(wordTokens: WordToken[]): DocBlock[] {
  const blocks: DocBlock[] = [];
  let currentParagraph: WordToken[] = [];
  let currentPIdx = -1;
  // Table accumulation
  let currentTable: TableBlock | null = null;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'paragraph', tokens: currentParagraph });
      currentParagraph = [];
      currentPIdx = -1;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      blocks.push(currentTable);
      currentTable = null;
    }
  };

  for (const tok of wordTokens) {
    // Table tokens
    if (tok.tableId) {
      flushParagraph();

      if (!currentTable || currentTable.tableId !== tok.tableId) {
        flushTable();
        currentTable = {
          type: 'table',
          tableId: tok.tableId,
          colWidths: tok.tableColWidths,
          cells: [],
        };
      }

      // Find or create cell
      const row = tok.cellRow ?? 0;
      const col = tok.cellCol ?? 0;
      let cell = currentTable.cells.find(c => c.row === row && c.col === col);
      if (!cell) {
        cell = {
          row, col,
          rowSpan: tok.cellRowSpan ?? 1,
          colSpan: tok.cellColSpan ?? 1,
          tokens: [],
        };
        currentTable.cells.push(cell);
      }
      // Update rowSpan if this token has it (the first token in a vMerge start carries it)
      if (tok.cellRowSpan && tok.cellRowSpan > cell.rowSpan) {
        cell.rowSpan = tok.cellRowSpan;
      }
      cell.tokens.push(tok);
      continue;
    }

    // Non-table tokens — flush any open table
    flushTable();

    if (tok.type === 'pageBreak') {
      flushParagraph();
      blocks.push({ type: 'pageBreak', token: tok });
      continue;
    }
    if (tok.type === 'htmlBlock') {
      flushParagraph();
      blocks.push({ type: 'html', token: tok });
      continue;
    }
    if (tok.type === 'unsupported') {
      flushParagraph();
      blocks.push({ type: 'unsupported', token: tok });
      continue;
    }

    // Regular paragraph token
    if (tok.paragraphIndex !== currentPIdx && currentParagraph.length > 0) {
      flushParagraph();
    }
    currentPIdx = tok.paragraphIndex;
    currentParagraph.push(tok);
  }

  flushParagraph();
  flushTable();
  return blocks;
}

// ── Build table rows/cols structure for rendering ────────────────────────────

interface TableRow { rowIdx: number; cells: TableCell[] }

function buildTableRows(cells: TableCell[]): TableRow[] {
  const rowMap = new Map<number, TableCell[]>();
  for (const cell of cells) {
    if (!rowMap.has(cell.row)) rowMap.set(cell.row, []);
    rowMap.get(cell.row)!.push(cell);
  }
  const rows: TableRow[] = [];
  for (const [rowIdx, rowCells] of rowMap) {
    rowCells.sort((a, b) => a.col - b.col);
    rows.push({ rowIdx, cells: rowCells });
  }
  rows.sort((a, b) => a.rowIdx - b.rowIdx);
  return rows;
}

export function DocumentArea({ previewMode = false, getFilledValue, transitionBeat = 0 }: DocumentAreaProps) {
  const s = useStyles();
  const { wordTokens, placeholders, selectionState, firstClickTokenId, selectedTokenIds,
    hoveredTokenId, clickWord, hoverWord, extendSelectionTo, clearHover, cancelSelection,
    createPlaceholder, renamePlaceholder, deletePlaceholder,
    createImageField, removeImageFieldTag } = useEditorStore(
    useShallow((s) => ({
      wordTokens: s.wordTokens, placeholders: s.placeholders, selectionState: s.selectionState,
      firstClickTokenId: s.firstClickTokenId, selectedTokenIds: s.selectedTokenIds,
      hoveredTokenId: s.hoveredTokenId,
      clickWord: s.clickWord, hoverWord: s.hoverWord, extendSelectionTo: s.extendSelectionTo,
      clearHover: s.clearHover,
      cancelSelection: s.cancelSelection, createPlaceholder: s.createPlaceholder,
      renamePlaceholder: s.renamePlaceholder, deletePlaceholder: s.deletePlaceholder,
      createImageField: s.createImageField, removeImageFieldTag: s.removeImageFieldTag,
    })),
  );
  const pageLayout = useEditorStore((s) => s.pageLayout);
  const paragraphStyles = useEditorStore((s) => s.paragraphStyles);
  const demoTargets = useDemoStore(useShallow((s) => s.isActive ? getDemoTargetTokens(s.demoStep) : []));
  const demoStep = useDemoStore((s) => s.isActive ? s.demoStep : null);
  // Subscribe to currentPreviewRow so preview re-renders when navigating rows
  useDataStore((s) => previewMode ? s.currentPreviewRow : 0);
  const mouseDownRef = useRef<string | null>(null);
  const interactedRef = useRef(false);
  // Image field dialog state: the clicked image token's id, or null.
  const [imageDialogTokenId, setImageDialogTokenId] = useState<string | null>(null);
  const imageDialogToken = imageDialogTokenId
    ? wordTokens.find((tk) => tk.id === imageDialogTokenId) ?? null
    : null;
  const [openChipTokenId, setOpenChipTokenId] = useState<string | null>(null);
  // While a selection is being grown with Shift+arrow the naming popover stays
  // closed (it would steal focus from the document and stop further extension);
  // Enter clears this and lets the popover open over the finished selection.
  const [keyboardSelecting, setKeyboardSelecting] = useState(false);
  // Committed (post-render) anchor element for the naming popover; see the effect
  // below for why it is deferred rather than read inline.
  const [popoverTarget, setPopoverTarget] = useState<HTMLSpanElement | null>(null);

  // Roving tabindex over the focusable words. Focus moves imperatively so plain
  // arrow navigation never re-renders the document, only selection changes do.
  const wordEls = useRef(new Map<string, HTMLSpanElement>());
  const rovingIdRef = useRef<string | null>(null);
  // Focusable = plain words not already claimed by a field (claimed tokens
  // render as chips, not as tabbable words).
  const focusableIds = useMemo(() => {
    if (previewMode) return [];
    const claimed = new Set<string>();
    placeholders.forEach((ph) => ph.occurrences.forEach((occ) => occ.forEach((id) => claimed.add(id))));
    return wordTokens.filter((t) => t.type === 'word' && !claimed.has(t.id)).map((t) => t.id);
  }, [previewMode, wordTokens, placeholders]);
  const focusableIdSet = useMemo(() => new Set(focusableIds), [focusableIds]);
  // Keep the single tab stop valid as the document changes (load, field created,
  // undo). When the roving word is gone, move to the next word at or after the
  // old spot so making a field does not throw focus back to the top. Render-time
  // so there is never a frame with no tabbable word.
  if (!previewMode && (rovingIdRef.current === null || !focusableIdSet.has(rovingIdRef.current))) {
    const prev = rovingIdRef.current;
    let next = focusableIds[0] ?? null;
    if (prev) {
      const prevIdx = wordTokens.findIndex((t) => t.id === prev);
      const after = prevIdx >= 0 ? wordTokens.slice(prevIdx + 1).find((t) => focusableIdSet.has(t.id)) : undefined;
      if (after) next = after.id;
    }
    rovingIdRef.current = next;
  }

  const setRovingTabIndex = useCallback((id: string | null) => {
    const prev = rovingIdRef.current;
    if (prev && prev !== id) {
      const pe = wordEls.current.get(prev);
      if (pe) pe.tabIndex = -1;
    }
    rovingIdRef.current = id;
    if (id) {
      const el = wordEls.current.get(id);
      if (el) el.tabIndex = 0;
    }
  }, []);
  const focusWord = useCallback((id: string) => {
    setRovingTabIndex(id);
    wordEls.current.get(id)?.focus();
  }, [setRovingTabIndex]);
  // Mouse or Tab can land focus on a word the roving pointer was not tracking;
  // resync so the next arrow key starts from where the user actually is.
  const handleWordFocus = useCallback((id: string) => {
    if (rovingIdRef.current !== id) setRovingTabIndex(id);
  }, [setRovingTabIndex]);

  const handleDocKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (previewMode || focusableIds.length === 0) return;
    const key = e.key;
    const goPrev = key === 'ArrowLeft' || key === 'ArrowUp';
    const goNext = key === 'ArrowRight' || key === 'ArrowDown';
    if (goPrev || goNext) {
      const curId = rovingIdRef.current;
      const idx = curId ? focusableIds.indexOf(curId) : -1;
      const nextIdx = goNext ? Math.min(focusableIds.length - 1, idx + 1) : Math.max(0, idx - 1);
      const targetId = focusableIds[nextIdx];
      if (!targetId) return;
      e.preventDefault();
      if (e.shiftKey) {
        // Anchor at the current word the first time, then grow the run.
        if (selectionState === 'idle' && curId) clickWord(curId);
        focusWord(targetId);
        extendSelectionTo(targetId);
        setKeyboardSelecting(true);
      } else {
        if (selectionState !== 'idle') cancelSelection();
        setKeyboardSelecting(false);
        focusWord(targetId);
      }
      return;
    }
    if (key === 'Enter' || key === ' ') {
      const curId = rovingIdRef.current;
      if (!curId) return;
      e.preventDefault();
      if (selectionState === 'idle') clickWord(curId);
      // Commit: let the naming popover open over the current selection.
      setKeyboardSelecting(false);
      return;
    }
    if (key === 'Escape') {
      if (selectionState !== 'idle') cancelSelection();
      setKeyboardSelecting(false);
      wordEls.current.get(rovingIdRef.current ?? '')?.blur();
    }
  };

  // Native text-selection path: when the user highlights words with the cursor
  // (rather than the click/Shift+arrow paths), translate the raw browser
  // selection into the same store state machine. Only word spans carry
  // data-token-id (spaces, newlines and claimed-word chips do not), so
  // intersecting them snaps endpoints to words and skips claimed tokens for free.
  const handleRootMouseUp = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (previewMode) return;
    const sel = window.getSelection();
    // Collapsed/empty selection means a plain click — leave it to the per-word
    // onMouseDown/onMouseUp handler.
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const root = e.currentTarget;
    if (!root.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
    const indexOf = new Map(wordTokens.map((tk, i) => [tk.id, i]));
    const hitIds: string[] = [];
    root.querySelectorAll('[data-token-id]').forEach((el) => {
      const id = el.getAttribute('data-token-id');
      if (id && indexOf.has(id) && sel.containsNode(el, true)) hitIds.push(id);
    });
    if (hitIds.length === 0) return;
    hitIds.sort((a, b) => indexOf.get(a)! - indexOf.get(b)!);
    const first = hitIds[0];
    const last = hitIds[hitIds.length - 1];
    // Reuse the existing range logic: anchor on the first word, then extend to
    // the last (a single-word highlight falls through to the oneWord state).
    cancelSelection();
    clickWord(first);
    if (last !== first) clickWord(last);
    // Drop the raw blue highlight so it doesn't fight the app's selected styling.
    sel.removeAllRanges();
    // The root onClick clears selection unless something was interacted with;
    // a whitespace-started drag never set this, so mark it here.
    interactedRef.current = true;
  };

  const { phTokens, chipAt } = useMemo(() => {
    const phTokens = new Set<string>();
    const chipAt = new Map<string, number>();
    placeholders.forEach((ph, idx) => {
      for (const occ of ph.occurrences) {
        chipAt.set(occ[0], idx);
        occ.forEach(id => phTokens.add(id));
      }
    });
    return { phTokens, chipAt };
  }, [placeholders]);

  // Token text glued to {{...}} braces, preserved around merged values (preview only).
  const coverage = useMemo(
    () => previewMode ? computePlaceholderCoverage(wordTokens) : new Map<string, TokenCoverage>(),
    [previewMode, wordTokens],
  );

  const selectedSet = useMemo(() => new Set(selectedTokenIds), [selectedTokenIds]);
  const previewSet = useMemo(() => {
    if (selectionState !== 'oneWord' || !firstClickTokenId || !hoveredTokenId) return new Set<string>();
    return new Set(getTokenRange(wordTokens, firstClickTokenId, hoveredTokenId));
  }, [selectionState, firstClickTokenId, hoveredTokenId, wordTokens]);

  const docBlocks = useMemo(() => buildBlocks(wordTokens), [wordTokens]);

  const popoverOpen = selectionState !== 'idle' && selectedTokenIds.length > 0
    && !keyboardSelecting
    && !(demoStep === 'step2_click' && selectionState === 'oneWord');
  // The naming popover anchors to the last selected word's live element (kept in
  // the wordEls map), so selecting never restructures the word's DOM node and
  // keyboard focus survives growing the selection. The anchor is committed to
  // state in an effect (post-commit), not read inline during render: a mouse
  // selection opens the popover synchronously inside the same event flush, and
  // Fluent's Popover, handed open+target in that one render, fails to mount its
  // surface; deferring the target a tick lets it open (this is the timing the
  // pre-item-5 wrapper-ref had by accident). Keyboard selection is unaffected.
  const lastSelectedId = selectedTokenIds.length ? selectedTokenIds[selectedTokenIds.length - 1] : null;
  useEffect(() => {
    setPopoverTarget(popoverOpen && lastSelectedId ? wordEls.current.get(lastSelectedId) ?? null : null);
  }, [popoverOpen, lastSelectedId]);

  const wrapFormat = (node: ReactNode, token: WordToken): ReactNode => {
    let el = node;
    if (token.bold) el = <strong>{el}</strong>;
    if (token.italic) el = <em>{el}</em>;
    return el;
  };

  const renderToken = (token: WordToken) => {
    if (token.type === 'image') {
      // Sized from the drawing extent at 96 px per inch (9525 EMU per px),
      // capped to the page column; aspectRatio keeps the sample box shape
      // when the cap kicks in.
      const w = token.imageEmuW ? Math.max(8, Math.round(token.imageEmuW / 9525)) : undefined;
      const h = token.imageEmuH ? Math.max(8, Math.round(token.imageEmuH / 9525)) : undefined;
      const fieldName = imageFieldNameFromDescr(token.imageDescr);
      const img = (
        <img src={token.text} alt={token.imageName ?? ''} data-testid="doc-image"
          style={{
            width: w, height: 'auto', maxWidth: '100%',
            aspectRatio: w && h ? `${w} / ${h}` : undefined,
            objectFit: 'fill', verticalAlign: 'middle', display: 'block',
          }} />
      );
      if (previewMode) {
        // Tagged drawings preview the current row's matched photo fitted in
        // the sample box, so what the user sees is what generates.
        if (fieldName && features.imagePlaceholders) {
          return <PreviewFieldImage key={token.id} token={token} fieldName={fieldName} />;
        }
        return (
          <span key={token.id} className={s.imageWrap}>
            {img}
          </span>
        );
      }
      const openDialog = () => setImageDialogTokenId(token.id);
      return (
        <span key={token.id} role="button" tabIndex={0}
          data-testid="doc-image-button"
          className={fieldName ? `${s.imageWrap} ${s.imageTagged}` : s.imageWrap}
          aria-label={fieldName
            ? t('a11y.imageFieldTagged', { name: fieldName })
            : t('a11y.imageFieldTag')}
          onMouseDown={() => { interactedRef.current = true; }}
          onClick={(e) => { e.stopPropagation(); openDialog(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDialog(); }
          }}>
          {img}
          {fieldName && <span className={s.imageChip} data-testid="image-badge">{fieldName}</span>}
        </span>
      );
    }
    if (phTokens.has(token.id)) {
      const cov = coverage.get(token.id);
      const phIdx = chipAt.get(token.id);
      if (phIdx === undefined) {
        // Claimed but not the value-bearing token: keep any token text that
        // lies outside the {{...}} match (e.g. a trailing comma or paren).
        const outside = cov ? cov.prefix + cov.suffix : '';
        return outside ? <span key={token.id}>{outside}</span> : null;
      }
      const ph = placeholders[phIdx];
      if (previewMode) {
        const value = getFilledValue?.(ph.name) ?? '';
        const reveal = transitionBeat >= 1 && transitionBeat < 2 ? phIdx * 150 : undefined;
        if (cov && (cov.prefix || cov.suffix)) {
          return (
            <span key={token.id}>
              {cov.prefix}
              <FilledValue value={value} placeholderName={ph.name}
                colorIndex={ph.colorIndex} placeholderId={ph.id} revealDelay={reveal} />
              {cov.suffix}
            </span>
          );
        }
        return <FilledValue key={token.id} value={value} placeholderName={ph.name}
          colorIndex={ph.colorIndex} placeholderId={ph.id} revealDelay={reveal} />;
      }
      return (
        <span key={token.id} onMouseDown={() => { interactedRef.current = true; }}>
          <PlaceholderChip placeholder={ph}
            open={openChipTokenId === token.id}
            onOpenChange={(isOpen) => setOpenChipTokenId(isOpen ? token.id : null)}
            onRename={(name) => { renamePlaceholder(ph.id, name); setOpenChipTokenId(null); }}
            onDelete={() => { deletePlaceholder(ph.id); setOpenChipTokenId(null); }} />
        </span>
      );
    }
    if (previewMode) {
      if (token.type === 'newline') return <br key={token.id} />;
      const pvStyle: CSSProperties | undefined =
        (token.fontSize || token.fontFamily || token.color || token.underline) ? {
          fontSize: token.fontSize ? `${token.fontSize}px` : undefined,
          fontFamily: token.fontFamily || undefined,
          color: token.color || undefined,
          textDecorationLine: token.underline ? 'underline' : undefined,
        } : undefined;
      return <span key={token.id} style={pvStyle}>{wrapFormat(token.text, token)}</span>;
    }

    const isSelected = selectedSet.has(token.id);
    return (
      <ClickableWord key={token.id} token={token} isSelected={isSelected}
        isRangePreview={previewSet.has(token.id)} isDisabled={false}
        isDemoTarget={demoTargets.includes(token.text)}
        tabIndex={token.id === rovingIdRef.current ? 0 : -1}
        registerRef={(node) => {
          if (node) wordEls.current.set(token.id, node);
          else wordEls.current.delete(token.id);
        }}
        onFocus={() => handleWordFocus(token.id)}
        onMouseDown={() => { interactedRef.current = true; mouseDownRef.current = token.id; setKeyboardSelecting(false); }}
        onMouseUp={() => {
          const d = mouseDownRef.current; mouseDownRef.current = null;
          if (d && d !== token.id) { clickWord(d); clickWord(token.id); }
          else clickWord(token.id);
        }}
        onMouseEnter={() => { if (selectionState === 'oneWord') hoverWord(token.id); }}
        onMouseLeave={clearHover} />
    );
  };

  const headingTag = (level: number | undefined): keyof JSX.IntrinsicElements => {
    if (level === 1) return 'h1';
    if (level === 2) return 'h2';
    if (level === 3) return 'h3';
    return 'p';
  };

  const renderParagraphTokens = (tokens: WordToken[], key: number | string) => {
    const first = tokens[0];
    const heading = first?.heading;
    const Tag = headingTag(heading);
    const ps = paragraphStyles[first.paragraphIndex];
    const pStyle: CSSProperties | undefined = ps ? {
      fontSize: ps.fontSize ? `${ps.fontSize}px` : undefined,
      lineHeight: ps.lineHeight !== undefined ? String(ps.lineHeight) : undefined,
      marginTop: ps.spacingBefore !== undefined ? `${ps.spacingBefore}px` : undefined,
      marginBottom: ps.spacingAfter !== undefined ? `${ps.spacingAfter}px` : undefined,
      textAlign: ps.alignment || undefined,
      paddingLeft: ps.indentLeft ? `${ps.indentLeft}px` : undefined,
      textIndent: ps.indentFirstLine ? `${ps.indentFirstLine}px` : undefined,
    } : undefined;
    return <Tag key={key} className={heading ? s[`h${heading}` as keyof typeof s] : undefined} style={pStyle}>{tokens.map(renderToken)}</Tag>;
  };

  const renderTable = (block: TableBlock, key: number) => {
    const rows = buildTableRows(block.cells);
    const totalWidth = block.colWidths?.reduce((a, b) => a + b, 0);

    return (
      <table key={key}>
        {block.colWidths && totalWidth && totalWidth > 0 && (
          <colgroup>
            {block.colWidths.map((w, ci) => (
              <col key={ci} style={{ width: w > 0 ? `${((w / totalWidth) * 100).toFixed(1)}%` : undefined }} />
            ))}
          </colgroup>
        )}
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowIdx}>
              {row.cells.map((cell) => {
                // Group cell tokens by paragraph
                const cellParas: WordToken[][] = [];
                let currentPara: WordToken[] = [];
                let pIdx = -1;
                for (const tok of cell.tokens) {
                  if (tok.paragraphIndex !== pIdx && currentPara.length > 0) {
                    cellParas.push(currentPara);
                    currentPara = [];
                  }
                  pIdx = tok.paragraphIndex;
                  currentPara.push(tok);
                }
                if (currentPara.length > 0) cellParas.push(currentPara);

                return (
                  <td
                    key={cell.col}
                    rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                    colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                  >
                    {cellParas.length <= 1
                      ? cellParas[0]?.map(renderToken)
                      : cellParas.map((para, pi) => (
                        <p key={pi} style={{ margin: '0 0 4px 0' }}>{para.map(renderToken)}</p>
                      ))
                    }
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className={s.root} data-testid="document-area"
      onKeyDown={previewMode ? undefined : handleDocKeyDown}
      onMouseUp={previewMode ? undefined : handleRootMouseUp}
      onClick={previewMode ? undefined : () => { if (!interactedRef.current) { cancelSelection(); setKeyboardSelecting(false); } interactedRef.current = false; }}>
      {!previewMode && (
        <div className={s.disclaimer}>
          <Info16Regular className={s.disclaimerIcon} />
          {t('editor.disclaimer')}
        </div>
      )}
      <DocumentPaper layout={pageLayout}>
        {docBlocks.map((block, i) => {
          switch (block.type) {
            case 'pageBreak':
              return <div key={i} className={s.pageBreak}><span className={s.pageBreakLabel}>{t('editor.pageBreak')}</span></div>;
            case 'html':
              return <div key={i} dangerouslySetInnerHTML={{ __html: block.token.text }} />;
            case 'unsupported':
              return <div key={i} className={s.unsupported}>{block.token.text}</div>;
            case 'table':
              return renderTable(block, i);
            case 'paragraph':
              return renderParagraphTokens(block.tokens, i);
          }
        })}
      </DocumentPaper>
      {!previewMode && <PlaceholderPopover open={popoverOpen && popoverTarget !== null}
        target={popoverTarget}
        onConfirm={createPlaceholder} onClose={cancelSelection} selectionState={selectionState}
        existingNames={placeholders.filter((p) => p.type !== 'image').map((p) => p.name)} />}
      <ImageFieldDialog
        open={imageDialogToken !== null}
        existingFieldName={imageDialogToken ? imageFieldNameFromDescr(imageDialogToken.imageDescr) : null}
        onCreate={(name) => { if (imageDialogToken) createImageField(imageDialogToken.id, name); setImageDialogTokenId(null); }}
        onRemove={() => { if (imageDialogToken) removeImageFieldTag(imageDialogToken.id); setImageDialogTokenId(null); }}
        onClose={() => setImageDialogTokenId(null)} />
    </div>
  );
}
