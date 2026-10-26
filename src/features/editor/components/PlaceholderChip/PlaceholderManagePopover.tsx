import { useState, useCallback } from 'react';
import { Input, Button } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import type { Placeholder } from '../../utils/types';
import { useStyles } from './PlaceholderChip.styles';

interface ManagePopoverProps {
  placeholder: Placeholder;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

export function PlaceholderManagePopover({ placeholder, onRename, onDelete }: ManagePopoverProps) {
  const s = useStyles();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(placeholder.name);

  const confirmRename = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== placeholder.name) onRename(trimmed);
    setRenaming(false);
  }, [name, placeholder.name, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') setRenaming(false);
  }, [confirmRename]);

  return (
    <div className={s.popover}>
      {renaming ? (
        <Input
          className={s.renameInput}
          value={name}
          onChange={(_, data) => setName(data.value)}
          onKeyDown={handleKeyDown}
          onBlur={confirmRename}
          autoFocus
        />
      ) : (
        <>
          <div className={s.phName}>{placeholder.name}</div>
          <div className={s.originalText}>&quot;{placeholder.originalText}&quot;</div>
          <div className={s.occurrences}>
            {tCount(placeholder.occurrences.length, 'placeholder.manage.occurrences')}
          </div>
        </>
      )}
      {!renaming && (
        <div className={s.actions}>
          <Button size="small" onClick={() => { setName(placeholder.name); setRenaming(true); }}>
            {t('placeholder.manage.rename')}
          </Button>
          <Button size="small" onClick={onDelete}>
            {t('placeholder.manage.delete')}
          </Button>
        </div>
      )}
    </div>
  );
}
