import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { getPlaceholderColor } from '../../utils/placeholderColors';
import { useStyles } from './FilledValue.styles';

interface FilledValueProps {
  value: string; placeholderName: string; colorIndex: number;
  placeholderId?: string;
  revealDelay?: number;
}

export function FilledValue({ value, placeholderName, colorIndex, placeholderId, revealDelay }: FilledValueProps) {
  const s = useStyles();
  const color = getPlaceholderColor(colorIndex);
  const tooltip = t('preview.tooltip', { name: placeholderName, value: value || placeholderName });
  const isRevealing = revealDelay !== undefined;
  const revealStyle = isRevealing ? { transitionDelay: `${revealDelay}ms` } : undefined;

  if (!value) {
    return (
      <Tooltip content={tooltip} relationship="description">
        <span className={mergeClasses(s.empty, isRevealing && s.revealing)}
          style={revealStyle} data-placeholder-id={placeholderId}>{placeholderName}</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltip} relationship="description">
      <span className={mergeClasses(s.root, isRevealing && s.revealing)}
        style={{ textDecorationColor: color.border, ...revealStyle }}
        data-placeholder-id={placeholderId}>{value}</span>
    </Tooltip>
  );
}
