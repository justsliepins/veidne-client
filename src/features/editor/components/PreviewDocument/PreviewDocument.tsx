import { useMemo } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import type { WordToken, Placeholder } from '../../utils/types';
import { computePlaceholderCoverage } from '../../store/editorHelpers';
import { PreviewFieldImage } from '../PreviewFieldImage';
import { imageFieldNameFromDescr } from '../../utils/imageFieldXml';
import { features } from '@/config/features';
import { useStyles } from './PreviewDocument.styles';

interface PreviewDocumentProps {
  wordTokens: WordToken[]; placeholders: Placeholder[];
  getFilledValue: (name: string) => string;
  transitionBeat?: number;
}

export function PreviewDocument({ wordTokens, placeholders, getFilledValue, transitionBeat = 0 }: PreviewDocumentProps) {
  const s = useStyles();
  const { phTokens, chipAt } = useMemo(() => {
    const phTokens = new Set<string>();
    const chipAt = new Map<string, number>();
    placeholders.forEach((ph, idx) => {
      for (const occ of ph.occurrences) {
        chipAt.set(occ[0], idx);
        occ.forEach(id => phTokens.add(id));
      }
    });
    return { phTokens, chipAt };
  }, [placeholders]);

  const coverage = useMemo(() => computePlaceholderCoverage(wordTokens), [wordTokens]);

  const paragraphs = useMemo(() => {
    const result: WordToken[][] = [];
    let group: WordToken[] = [];
    let pIdx = -1;
    for (const tok of wordTokens) {
      if (tok.paragraphIndex !== pIdx && group.length) { result.push(group); group = []; }
      pIdx = tok.paragraphIndex;
      group.push(tok);
    }
    if (group.length) result.push(group);
    return result;
  }, [wordTokens]);

  const isRevealing = transitionBeat >= 1 && transitionBeat < 2;

  const renderToken = (token: WordToken) => {
    // Image tokens render as pictures even when claimed by an image field;
    // the filename cell value is never shown as a text pill.
    if (token.type === 'image') {
      const fieldName = imageFieldNameFromDescr(token.imageDescr);
      if (fieldName && features.imagePlaceholders) {
        return <PreviewFieldImage key={token.id} token={token} fieldName={fieldName} />;
      }
      const w = token.imageEmuW ? Math.max(8, Math.round(token.imageEmuW / 9525)) : undefined;
      const h = token.imageEmuH ? Math.max(8, Math.round(token.imageEmuH / 9525)) : undefined;
      return (
        <img key={token.id} src={token.text} alt={token.imageName ?? ''} data-testid="doc-image"
          style={{
            width: w, height: 'auto', maxWidth: '100%',
            aspectRatio: w && h ? `${w} / ${h}` : undefined,
            objectFit: 'fill', verticalAlign: 'middle',
          }} />
      );
    }
    if (phTokens.has(token.id)) {
      const cov = coverage.get(token.id);
      const phIdx = chipAt.get(token.id);
      if (phIdx === undefined) {
        // Claimed but not the value-bearing token: keep any token text that
        // lies outside the {{...}} match (e.g. a trailing comma or paren).
        const outside = cov ? cov.prefix + cov.suffix : '';
        return outside ? <span key={token.id}>{outside}</span> : null;
      }
      const ph = placeholders[phIdx];
      const value = getFilledValue(ph.name);
      const cls = value ? s.highlight : s.emptyValue;
      return (
        <span key={token.id}>
          {cov?.prefix}
          <span
            className={mergeClasses(cls, isRevealing && s.revealing)}
            style={isRevealing ? { transitionDelay: `${phIdx * 150}ms` } : undefined}>
            {value || '\u2014'}
          </span>
          {cov?.suffix}
        </span>
      );
    }
    if (token.type === 'newline') return <br key={token.id} />;
    return <span key={token.id}>{token.text}</span>;
  };

  return (
    <div className={s.root} data-testid="preview-panel-doc">
      {paragraphs.map((tokens, i) => (
        <div key={i} className={s.text}>{tokens.map(renderToken)}</div>
      ))}
    </div>
  );
}
