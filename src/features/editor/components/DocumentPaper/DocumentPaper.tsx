import type { CSSProperties, ReactNode } from 'react';
import type { PageLayout } from '../../utils/types';
import { useStyles } from './DocumentPaper.styles';

interface DocumentPaperProps {
  children: ReactNode;
  layout?: PageLayout | null;
}

export function DocumentPaper({ children, layout }: DocumentPaperProps) {
  const s = useStyles();
  // Feed the docx page metrics as CSS variables so the stylesheet (and its media
  // queries) controls the actual width/padding. This lets the paper keep full
  // fidelity on desktop while reflowing to the viewport on mobile (maxWidth:100%),
  // which an inline width/padding would otherwise override.
  const style = layout ? ({
    '--doc-w': `${layout.pageWidth}px`,
    '--doc-h': `${layout.pageHeight}px`,
    '--doc-pt': `${layout.marginTop}px`,
    '--doc-pb': `${layout.marginBottom}px`,
    '--doc-pl': `${layout.marginLeft}px`,
    '--doc-pr': `${layout.marginRight}px`,
  } as CSSProperties) : undefined;
  return <div className={s.root} style={style}>{children}</div>;
}
