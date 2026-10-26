import { useState, useEffect, type ReactNode, type CSSProperties } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { Checkmark16Regular, ArrowDownload16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { getPlaceholderColor } from '@/features/editor/utils/placeholderColors';
import { DropZone } from '@/shared/components/DropZone';
import { generateKitSpreadsheet } from '@/features/data/utils/generateKitSpreadsheet';
import { useDataStore } from '@/features/data/store/dataStore';
import { useStyles } from './KitFlow.styles';

interface KitFlowProps {
  placeholders: Array<{ name: string; colorIndex: number }>;
  baseName: string;
  onUpload: (file: File) => void;
  onError?: (err: { message: string }) => void;
  onBack: () => void;
}

function cellStyle(last: boolean): CSSProperties {
  return { padding: '6px 12px', borderBottom: last ? 'none' : '1px solid #F3F4F6' };
}

function exampleValues(fieldName: string): [string, string, string] {
  const n = fieldName.toLowerCase();
  if (n.includes('name')) return ['Anna', 'John', 'Maria'];
  if (n.includes('date')) return ['2026-01-15', '2026-02-20', '2026-03-10'];
  if (n.includes('email')) return ['anna@example.com', 'john@example.com', 'maria@example.com'];
  if (n.includes('city') || n.includes('location') || n.includes('address')) return ['Riga', 'Tallinn', 'Vilnius'];
  return ['Value 1', 'Value 2', 'Value 3'];
}

function MiniTable({ data, headers }: { data: boolean; headers: Array<{ name: string; colorIndex: number }> }) {
  const s = useStyles();
  const exampleRows = data ? [0, 1, 2].map(row => headers.map(h => exampleValues(h.name)[row])) : null;
  return (
    <div className={s.tableWrap}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead><tr>{headers.map(ph => {
          const c = getPlaceholderColor(ph.colorIndex);
          return <th key={ph.name} style={{ ...cellStyle(false), fontWeight: 600, color: c.chipText, textAlign: 'left' as const }}>{ph.name}</th>;
        })}</tr></thead>
        <tbody>{exampleRows ? exampleRows.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j} style={{ ...cellStyle(i === 2), color: '#6B7280' }}>{cell}</td>)}</tr>
        )) : [0, 1].map(i => (
          <tr key={i}>{headers.map((_, j) => <td key={j} style={cellStyle(i === 1)}>&nbsp;</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Step({ num, done, last, children }: { num: number; done: boolean; last?: boolean; children: ReactNode }) {
  const s = useStyles();
  return (
    <li className={s.step}>
      {!last && <div className={mergeClasses(s.connector, done && s.connectorDone)} />}
      <div className={mergeClasses(s.circle, done && s.circleDone)}>{done ? <Checkmark16Regular /> : num}</div>
      <div className={s.stepBody}>{children}</div>
    </li>
  );
}

export function KitFlow({ placeholders, baseName, onUpload, onError, onBack }: KitFlowProps) {
  const s = useStyles();
  const [dlState, setDlState] = useState<'ready' | 'success' | 'again'>('ready');
  const [pulseActive, setPulseActive] = useState(false);
  useEffect(() => {
    if (dlState !== 'success') return;
    const id = setTimeout(() => { setDlState('again'); setPulseActive(true); }, 2000);
    return () => clearTimeout(id);
  }, [dlState]);
  const handleDl = () => { generateKitSpreadsheet(placeholders.map(p => p.name), baseName + '.docx'); useDataStore.getState().setKitDownloaded(true); setDlState('success'); };
  const dlDone = dlState !== 'ready';
  const hdrs = placeholders.slice(0, 6);
  return (
    <div className={s.root}><ol className={s.inner}>
      <Step num={1} done={dlDone}>
        <div className={s.stepTitle}>{t('kit.step1.title')}</div>
        <div className={s.stepDesc}>{t('kit.step1.description')}</div>
        <MiniTable data={false} headers={hdrs} />
        <div aria-live="polite">
          {dlState === 'ready' && <button type="button" className={s.downloadBtn} onClick={handleDl}><ArrowDownload16Regular /> {t('kit.step1.button')}</button>}
          {dlState === 'success' && <button type="button" className={s.downloadedBtn} disabled><Checkmark16Regular /> {t('kit.step1.downloaded')}</button>}
          {dlState === 'again' && <button type="button" className={s.againBtn} onClick={handleDl}><ArrowDownload16Regular /> {t('kit.step1.downloadAgain')}</button>}
        </div>
        <div className={s.fileName}>{baseName}_data.xlsx</div>
      </Step>
      <Step num={2} done={false}>
        <div className={s.stepTitle}>{t('kit.step2.title')}</div>
        <div className={s.stepDesc}>{t('kit.step2.description')}</div>
        <MiniTable data headers={hdrs} />
      </Step>
      <Step num={3} done={false} last>
        <div className={s.stepTitle}>{t('kit.step3.title')}</div>
        <div className={pulseActive ? s.dropPulse : undefined}>
          <DropZone accept={['.xlsx', '.xls']} onFile={onUpload} onError={onError} titleKey="data.upload.title" subtitleKey="data.upload.subtitle" formatHintKey="dropZone.formats" />
        </div>
      </Step>
    </ol>
      <button type="button" className={s.backLink} onClick={onBack}>{t('kit.back')}</button>
    </div>
  );
}
