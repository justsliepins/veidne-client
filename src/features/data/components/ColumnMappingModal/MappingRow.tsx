import { Dropdown, Option } from '@fluentui/react-components';
import { CheckmarkCircle16Regular, Warning16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useStyles } from './ColumnMappingModal.styles';

interface MappingRowProps {
  column: string;
  selectedPlaceholder: string;
  availablePlaceholders: string[];
  previewValue: string;
  isMatched: boolean;
  readOnly?: boolean;
  onChange: (placeholder: string) => void;
}

export function MappingRow({ column, selectedPlaceholder, availablePlaceholders, previewValue, isMatched, readOnly, onChange }: MappingRowProps) {
  const s = useStyles();
  return (
    <div className={s.row}>
      {isMatched
        ? <CheckmarkCircle16Regular className={s.iconMatched} />
        : <Warning16Regular className={s.iconUnmatched} />}
      <span className={s.colName} title={column}>{column}</span>
      <span className={s.fills}>{t('data.mapping.fills')}</span>
      {readOnly ? (
        <span className={s.staticPlaceholder}>{selectedPlaceholder || t('data.mapping.noMatch')}</span>
      ) : (
        <div className={s.dropdownCol}>
          <Dropdown className={s.dropdown} value={selectedPlaceholder || t('data.mapping.selectPlaceholder')}
            selectedOptions={selectedPlaceholder ? [selectedPlaceholder] : []}
            onOptionSelect={(_, d) => onChange(d.optionValue ?? '')}>
            {availablePlaceholders.map(ph => <Option key={ph} value={ph}>{ph}</Option>)}
          </Dropdown>
          {!selectedPlaceholder && <span className={s.skipHint}>{t('data.mapping.willSkip')}</span>}
        </div>
      )}
      {!readOnly && <span className={s.preview}>{previewValue}</span>}
    </div>
  );
}
