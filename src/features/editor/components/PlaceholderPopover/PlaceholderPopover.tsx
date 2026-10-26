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
}

const HINT_KEY = 'veidne_rangeHintSeen';
const mobileQuery = `(max-width: ${parseInt(veidneTokens.breakpoints.sm) - 1}px)`;

export function PlaceholderPopover({ open, target, onConfirm, onClose, selectionState, existingNames }: PlaceholderPopoverProps) {
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

  const inputContent = mergeName !== null ? (
    // The surface is portaled, but React events still bubble to the
    // document area's root onClick, which clears the selection (closing this
    // popover). Contain the merge step's clicks so Cancel can return to the
    // name input.
    <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
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
  ) : (
    <>
      <div className={s.inputRow}>
        <Input
          ref={inputRef}
          className={shaking ? s.shakeInput : s.input}
          style={shaking ? { borderColor: '#DC2626' } : undefined}
          value={name}
          onChange={(_, data) => setName(data.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder.popover.namePlaceholder')}
        />
        <button type="button" className={s.confirmBtn} onClick={handleConfirm} aria-label={t('a11y.confirmPlaceholder')}>
          <Checkmark16Regular />
        </button>
      </div>
      {!hintDismissed && selectionState === 'oneWord' && (
        <div className={s.hint}>{t('placeholder.popover.rangeHint')}</div>
      )}
    </>
  );

  if (isMobile) {
    if (!open) return null;
    return (
      <>
        <div className={s.backdrop} onClick={onClose} />
        <div className={s.mobileSheet}>{inputContent}</div>
      </>
    );
  }

  return (
    <Popover
      open={open}
      positioning={{ target: target, position: 'below', align: 'start' }}
      onOpenChange={(_, data) => { if (!data.open) onClose(); }}
    >
      <PopoverSurface className={s.surface}>
        {inputContent}
      </PopoverSurface>
    </Popover>
  );
}
