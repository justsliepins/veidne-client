import { useEffect, useState, useCallback } from 'react';
import { veidneTokens } from '@/design-system/tokens';
import { getPlaceholderColor } from '../../utils/placeholderColors';
import type { Placeholder } from '../../utils/types';
import { PlaceholderManagePopover } from './PlaceholderManagePopover';
import { useStyles } from './PlaceholderChip.styles';

interface PlaceholderChipProps {
  placeholder: Placeholder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

const mobileQuery = `(max-width: ${parseInt(veidneTokens.breakpoints.sm) - 1}px)`;

export function PlaceholderChip({ placeholder, open, onOpenChange, onRename, onDelete }: PlaceholderChipProps) {
  const s = useStyles();
  const color = getPlaceholderColor(placeholder.colorIndex);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(mobileQuery).matches);

  useEffect(() => {
    const mql = window.matchMedia(mobileQuery);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleRename = useCallback((newName: string) => {
    onRename(newName);
    onOpenChange(false);
  }, [onRename, onOpenChange]);

  const handleDelete = useCallback(() => {
    onDelete();
    onOpenChange(false);
  }, [onDelete, onOpenChange]);

  return (
    <span className={s.chipWrapper}>
      <span
        className={s.chip}
        style={{ backgroundColor: color.bg, borderColor: color.border }}
        title={placeholder.name}
        onClick={() => onOpenChange(!open)}
      >
        <span className={s.name} style={{ color: color.border }}>
          {placeholder.name}
        </span>
      </span>
      {open && (
        <>
          <div
            className={isMobile ? s.backdrop : s.invisibleBackdrop}
            onClick={() => onOpenChange(false)}
          />
          <div
            className={isMobile ? s.mobileSheet : s.desktopPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <PlaceholderManagePopover
              placeholder={placeholder}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}
    </span>
  );
}
