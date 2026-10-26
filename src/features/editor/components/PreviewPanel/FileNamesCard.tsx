import { useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Dropdown,
  Option,
  Input,
  RadioGroup,
  Radio,
  useId,
  mergeClasses,
} from '@fluentui/react-components';
import { ChevronDown16Regular, Warning16Filled } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useDataStore } from '@/features/data/store/dataStore';
import { useEditorStore } from '../../store/editorStore';
import {
  mappedFields,
  previewFileNames,
  collisionInfo,
  suggestSecondField,
  type NamingConfig,
} from '@/features/generator/utils/fileNaming';
import { useStyles } from './FileNamesCard.styles';

const PREVIEW_LIMIT = 3;

export function FileNamesCard() {
  const s = useStyles();
  const fieldId = useId('naming-field');
  const prefixId = useId('naming-prefix');
  const secondId = useId('naming-second');
  const titleId = useId('naming-title');

  const placeholders = useEditorStore((st) => st.placeholders);
  const { rows, columnMapping, namingConfig, setNamingConfig } = useDataStore(
    useShallow((st) => ({
      rows: st.rows,
      columnMapping: st.columnMapping,
      namingConfig: st.namingConfig,
      setNamingConfig: st.setNamingConfig,
    })),
  );

  const fields = useMemo(
    () => mappedFields(columnMapping, placeholders),
    [columnMapping, placeholders],
  );

  // Effective config: fall back to the first mapped field if none chosen yet.
  const config: NamingConfig = useMemo(
    () => ({ ...namingConfig, field: namingConfig.field || fields[0] || '' }),
    [namingConfig, fields],
  );

  const [showAdvanced, setShowAdvanced] = useState(Boolean(namingConfig.prefix));

  const preview = useMemo(
    () => previewFileNames(config, rows, columnMapping, placeholders, PREVIEW_LIMIT),
    [config, rows, columnMapping, placeholders],
  );

  // Collisions if the chosen field alone named every file (drives the warning).
  const baseCollision = useMemo(
    () => collisionInfo({ ...config, dupeMode: 'number', secondField: null }, rows, columnMapping, placeholders),
    [config, rows, columnMapping, placeholders],
  );
  // Residual collisions once the second field is added (identical rows).
  const residualCollision = useMemo(
    () => (config.dupeMode === 'field' && config.secondField
      ? collisionInfo(config, rows, columnMapping, placeholders)
      : null),
    [config, rows, columnMapping, placeholders],
  );

  const secondFieldOptions = useMemo(
    () => fields.filter((f) => f !== config.field),
    [fields, config.field],
  );

  const onFieldChange = useCallback((value: string) => {
    // Changing the primary field resets duplicate handling to the default.
    setNamingConfig({ field: value, secondField: null, dupeMode: 'number' });
  }, [setNamingConfig]);

  const onDupeMode = useCallback((mode: string) => {
    if (mode === 'field') {
      const suggestion = config.secondField ?? suggestSecondField(config, rows, columnMapping, placeholders);
      setNamingConfig({ dupeMode: 'field', secondField: suggestion });
    } else {
      setNamingConfig({ dupeMode: 'number' });
    }
  }, [config, rows, columnMapping, placeholders, setNamingConfig]);

  const moreCount = preview.total - preview.names.length;
  const canAddField = secondFieldOptions.length > 0;

  return (
    <section className={s.card} aria-labelledby={titleId}>
      <span id={titleId} className={s.title}>{t('naming.title')}</span>

      <div className={s.field}>
        <label className={s.label} htmlFor={fieldId}>{t('naming.field.label')}</label>
        <Dropdown
          id={fieldId}
          className={s.dropdown}
          value={config.field}
          selectedOptions={config.field ? [config.field] : []}
          onOptionSelect={(_, d) => onFieldChange(d.optionValue ?? '')}
        >
          {fields.map((f) => <Option key={f} value={f}>{f}</Option>)}
        </Dropdown>
      </div>

      <button
        type="button"
        className={s.advancedToggle}
        aria-expanded={showAdvanced}
        onClick={() => setShowAdvanced((v) => !v)}
      >
        <ChevronDown16Regular className={mergeClasses(s.chev, showAdvanced && s.chevOpen)} />
        {t('naming.advanced')}
      </button>
      {showAdvanced && (
        <div className={s.reveal}>
          <label className={s.label} htmlFor={prefixId}>{t('naming.prefix.label')}</label>
          <Input
            id={prefixId}
            value={namingConfig.prefix ?? ''}
            placeholder={t('naming.prefix.placeholder')}
            onChange={(_, d) => setNamingConfig({ prefix: d.value })}
          />
        </div>
      )}

      {baseCollision.hasDuplicates && (
        <div className={s.warning} role="status">
          <Warning16Filled className={s.warnIcon} />
          <div className={s.warnBody}>
            <span className={s.warnText}>
              {t('naming.dupes.warning', {
                count: String(baseCollision.worstCount),
                name: `${baseCollision.worstStem}.docx`,
              })}
            </span>
            <RadioGroup
              className={s.radioRow}
              value={config.dupeMode}
              onChange={(_, d) => onDupeMode(d.value)}
            >
              <Radio value="number" label={t('naming.dupes.number')} />
              <Radio value="field" label={t('naming.dupes.field')} disabled={!canAddField} />
            </RadioGroup>
            {config.dupeMode === 'field' && canAddField && (
              <div className={s.reveal}>
                <label className={s.label} htmlFor={secondId}>{t('naming.second.label')}</label>
                <Dropdown
                  id={secondId}
                  className={s.dropdown}
                  value={config.secondField ?? ''}
                  selectedOptions={config.secondField ? [config.secondField] : []}
                  onOptionSelect={(_, d) => setNamingConfig({ secondField: d.optionValue ?? null })}
                >
                  {secondFieldOptions.map((f) => <Option key={f} value={f}>{f}</Option>)}
                </Dropdown>
                {residualCollision?.hasDuplicates && (
                  <span className={s.note}>{t('naming.dupes.residual')}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={s.previewBlock}>
        <span className={s.previewLabel}>{t('naming.preview.label')}</span>
        <ul className={s.previewList}>
          {preview.names.map((n) => <li key={n} className={s.previewItem}>{n}</li>)}
        </ul>
        {moreCount > 0 && (
          <span className={s.moreLine}>{t('naming.preview.more', { count: String(moreCount) })}</span>
        )}
      </div>
    </section>
  );
}
