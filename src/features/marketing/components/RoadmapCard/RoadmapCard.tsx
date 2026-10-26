import { Button, mergeClasses } from '@fluentui/react-components';
import { useTranslation } from '@/i18n/useTranslation';
import { useRoadmapCardStyles } from './RoadmapCard.styles';

interface RoadmapCardProps {
  title: string;
  description: string;
  votable?: boolean;
  hasVoted?: boolean;
  onVote?: () => void;
}

export function RoadmapCard({
  title,
  description,
  votable = false,
  hasVoted = false,
  onVote,
}: RoadmapCardProps) {
  const styles = useRoadmapCardStyles();
  const { t } = useTranslation();

  return (
    <div className={mergeClasses(styles.card, votable ? styles.votableCard : styles.staticCard)}>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
      {votable && (
        <Button
          className={mergeClasses(styles.voteBtn, hasVoted ? styles.voted : styles.unvoted)}
          aria-pressed={hasVoted} aria-label={hasVoted ? t('roadmap.unvote', { title }) : t('roadmap.vote', { title })}
          onClick={onVote}
        >
          {hasVoted ? t('roadmap.voted') : t('roadmap.voteButton')}
        </Button>
      )}
    </div>
  );
}
