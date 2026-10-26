import { useState, useCallback } from 'react';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Tooltip,
  mergeClasses,
} from '@fluentui/react-components';
import { ArrowDownload16Regular, ChevronDown16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { downloadTaggedTemplate } from '@/features/generator/utils/sourceFiles';
import { buildKitSpreadsheet } from '@/features/data/utils/generateKitSpreadsheet';
import { triggerDownload } from '@/features/generator/utils/downloadHelpers';
import type { Placeholder } from '@/features/editor/utils/types';
import { useStyles } from './DownloadMenu.styles';

interface DownloadMenuProps {
  rawDocxBytes: ArrayBuffer | null;
  placeholders: Placeholder[];
  baseName: string;
}

export function DownloadMenu({ rawDocxBytes, placeholders, baseName }: DownloadMenuProps) {
  const s = useStyles();
  const [open, setOpen] = useState(false);
  const disabled = placeholders.length === 0 || !rawDocxBytes;

  const handleData = useCallback(() => {
    const { blob, fileName } = buildKitSpreadsheet(placeholders.map((p) => p.name), baseName + '.docx');
    triggerDownload(blob, fileName);
    trackEvent('kit_downloaded', { source: 'editor_download_menu', file: 'data' });
    setOpen(false);
  }, [placeholders, baseName]);

  const handleTemplate = useCallback(() => {
    // Reads the store at click time, not render: the tokens carry the
    // positional anchors the tagger needs for fields spanning mixed runs.
    downloadTaggedTemplate('editor_download_menu');
    setOpen(false);
  }, []);

  // Kept focusable while disabled (aria-disabled, not the disabled attribute) so
  // the tooltip explaining why still surfaces on hover and keyboard focus.
  if (disabled) {
    return (
      <Tooltip content={t('download.disabledHint')} relationship="description" withArrow>
        <button
          type="button"
          className={mergeClasses(s.trigger, s.triggerDisabled)}
          aria-disabled="true"
          aria-haspopup="menu"
          onClick={(e) => e.preventDefault()}
        >
          <ArrowDownload16Regular />
          {t('download.button')}
          <ChevronDown16Regular className={s.chevron} />
        </button>
      </Tooltip>
    );
  }

  return (
    <Menu open={open} onOpenChange={(_, data) => setOpen(data.open)} positioning="below-end">
      <MenuTrigger disableButtonEnhancement>
        <button type="button" className={s.trigger} aria-haspopup="menu">
          <ArrowDownload16Regular />
          {t('download.button')}
          <ChevronDown16Regular className={s.chevron} />
        </button>
      </MenuTrigger>
      <MenuPopover className={s.popover}>
        <MenuList aria-label={t('download.menuLabel')}>
          <MenuItem className={s.item} onClick={handleData}>
            <span className={s.itemHead}>
              <span className={s.itemTitle}>{t('download.data.title')}</span>
              <span className={s.tag}>.xlsx</span>
            </span>
            <span className={s.itemDesc}>{t('download.data.desc')}</span>
          </MenuItem>
          <MenuItem className={s.item} onClick={handleTemplate}>
            <span className={s.itemHead}>
              <span className={s.itemTitle}>{t('download.template.title')}</span>
              <span className={s.tag}>.docx</span>
            </span>
            <span className={s.itemDesc}>{t('download.template.desc')}</span>
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
