import { useState } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './TemplateCard.styles';

interface TemplateCardProps {
  slug: string;
  name: string;
  description: string;
  onClick: () => void;
}

export function TemplateCard({ slug, name, description, onClick }: TemplateCardProps) {
  const s = useStyles();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <button type="button" className={s.root} onClick={onClick} title={description} aria-label={name}>
      <div className={s.preview}>
        {/* Neutral document motif underneath: shows while loading and if the image is missing. */}
        <div className={s.placeholder} aria-hidden="true">
          <div className={s.page}>
            <span className={mergeClasses(s.line, s.lineTitle)} />
            <span className={s.line} />
            <span className={s.line} />
            <span className={mergeClasses(s.line, s.lineShort)} />
          </div>
          <span className={s.placeholderName}>{name}</span>
        </div>
        {status === 'loading' && <div className={s.skeleton} aria-hidden="true" />}
        {status !== 'error' && (
          <img
            className={mergeClasses(s.previewImg, status === 'loaded' && s.previewImgLoaded)}
            src={`/templates/${slug}.png`}
            alt=""
            loading="lazy"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
          />
        )}
      </div>
      <div className={s.info}>
        <div className={s.name} title={name}>{name}</div>
      </div>
    </button>
  );
}
