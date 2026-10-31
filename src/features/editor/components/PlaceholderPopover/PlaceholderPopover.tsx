import { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverSurface, Input } from '@fluentui/react-components';
import { Checkmark16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { veidneTokens } from '@/design-system/tokens';
import type { SelectionState } from '../../utils/types';
import { useStyles } from './PlaceholderPopover.styles';

interface PlaceholderPopoverProps {
  open: boolean; target: HTMLElement | null;
  onConfirm: (name: string) => void; onClose: () => void;
  selectionState: SelectionState;
  /** Names of existing text fields; confirming one of these asks the user
   *  to merge the selection into that field instead of creating a twin. */
  existingNames: string[];
  /** The selected words as the field will hold them; shown in the phone sheet. */
  selectedText: string;
  /** Phone sheet: whether "Extend to next word" has a word to grow into. */
  canExtend: boolean;
  onExtend: () => void;
}

const HINT_KEY = 'veidne_rangeHintSeen';
const mobileQuery = `(max-width: ${parseInt(veidneTokens.breakpoints.sm) - 1}px)`;

// Clicks inside the naming UI must never reach the document area's root
// onClick, which clears the selection and so closed this popover whenever the
// name input itself was clicked or tapped. The desktop surface is portaled, but
// React events still bubble through the React tree; the phone sheet sits inside
// the document area.
const contain = (e: React.SyntheticEvent) => e.stopPropagation();

export function PlaceholderPopover({ open, target, onConfirm, onClose, selectionState, existingNames, selectedText, canExtend, onExtend }: PlaceholderPopoverProps) {
  const s = useStyles();
  const [name, setName] = useState('');
  const [shaking, setShaking] = useState(false);
  // Non-null while asking "merge into the existing field of this name?".
  const [mergeName, setMergeName] = useState<string | null>(null);
  const [hintDismissed, setHintDismissed] = useState(() => localStorage.getItem(HINT_KEY) === 'true');
  const [prevOpen, setPrevOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mql = window.matchMedia(mobileQuery);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (open && !prevOpen) {
    setPrevOpen(true);
    setName('');
    setShaking(false);
    setMergeName(null);
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }
  if (selectionState === 'rangeSelected' && !hintDismissed) {
    setHintDismissed(true);
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  }, [open]);
  useEffect(() => {
    if (hintDismissed) localStorage.setItem(HINT_KEY, 'true');
  }, [hintDismissed]);

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      return;
    }
    // Same name as an existing field: ask before merging the selection into
    // it rather than silently creating a duplicate field entry.
    if (existingNames.includes(trimmed)) {
      setMergeName(trimmed);
      return;
    }
    onConfirm(trimmed);
  }, [name, onConfirm, existingNames]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleConfirm(); } }, [handleConfirm]);

  const mergeStep = mergeName !== null && (
    <div>
      <div className={s.hint}>{t('placeholder.popover.mergeConfirm', { name: mergeName })}</div>
      <div className={s.mergeRow}>
        <button type="button" className={s.mergeBtn}
          onClick={() => { setMergeName(null); onConfirm(mergeName); }}>
          {t('placeholder.popover.mergeYes')}
        </button>
        <button type="button" className={s.mergeCancelBtn}
          onClick={() => {
            setMergeName(null);
            setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
          }}>
          {t('placeholder.popover.mergeNo')}
        </button>
      </div>
    </div>
  );

  const nameRow = (
    <div className={s.inputRow}>
      <Input
        ref={inputRef}
        className={shaking ? s.shakeInput : s.input}
        style={shaking ? { borderColor: '#DC2626' } : undefined}
        value={name}
        onChange={(_, data) => setName(data.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholder.popover.namePlaceholder')}
        aria-label={t('placeholder.popover.nameLabel')}
        aria-describedby="field-name-hint"
      />
      <button type="button" className={s.confirmBtn} onClick={handleConfirm} aria-label={t('a11y.confirmPlaceholder')}>
        <Checkmark16Regular />
      </button>
    </div>
  );

  const showRangeHint = !hintDismissed && selectionState === 'oneWord';

  if (isMobile) {
    if (!open) return null;
    // No backdrop: the document stays tappable while the sheet is open, so a
    // second tap on a word extends the selection, as a second click does on
    // desktop. Cancel takes over the backdrop's job of closing the sheet.
    return (
      <section className={s.mobileSheet} aria-label={t('placeholder.popover.sheetLabel')}
        data-testid="field-sheet" onMouseDown={contain} onClick={contain}>
        {mergeStep || (
          <>
            <p className={s.selected} data-testid="field-sheet-selected">
              {t('placeholder.popover.selected', { text: selectedText })}
            </p>
            {nameRow}
            <div className={s.sheetActions}>
              <button type="button" className={s.sheetBtn} onClick={onExtend} disabled={!canExtend}>
                {t('placeholder.popover.extend')}
              </button>
              <button type="button" className={s.sheetCancel} onClick={onClose}>
                {t('placeholder.popover.cancel')}
              </button>
            </div>
            <div id="field-name-hint" className={s.hint}>{t('placeholder.popover.nameHint')}</div>
            {showRangeHint && <div className={s.hint}>{t('placeholder.popover.rangeHintTouch')}</div>}
          </>
        )}
      </section>
    );
  }

  return (
    <Popover
      open={open}
      positioning={{ target: target, position: 'below', align: 'start' }}
      onOpenChange={(_, data) => { if (!data.open) onClose(); }}
    >
      <PopoverSurface className={s.surface} onMouseDown={contain} onClick={contain}>
        {mergeStep || (
          <>
            {nameRow}
            <div id="field-name-hint" className={s.hint}>{t('placeholder.popover.nameHint')}</div>
            {showRangeHint && <div className={s.hint}>{t('placeholder.popover.rangeHint')}</div>}
          </>
        )}
      </PopoverSurface>
    </Popover>
  );
}
