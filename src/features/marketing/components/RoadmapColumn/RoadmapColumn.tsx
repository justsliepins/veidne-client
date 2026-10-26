import type { ReactNode } from 'react';
import { useRoadmapColumnStyles } from './RoadmapColumn.styles';

interface RoadmapColumnProps {
  title: string;
  dotColor: string;
  children: ReactNode;
}

export function RoadmapColumn({ title, dotColor, children }: RoadmapColumnProps) {
  const styles = useRoadmapColumnStyles();

  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <div className={styles.dot} style={{ backgroundColor: dotColor }} />
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.cards}>{children}</div>
    </div>
  );
}
