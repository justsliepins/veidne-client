import { Search20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useStyles } from './TemplateSearch.styles';

interface TemplateSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function TemplateSearch({ value, onChange }: TemplateSearchProps) {
  const s = useStyles();
  return (
    <div className={s.root}>
      <Search20Regular className={s.icon} />
      <input className={s.input} type="text" value={value}
        placeholder={t('templates.modal.search')}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}
