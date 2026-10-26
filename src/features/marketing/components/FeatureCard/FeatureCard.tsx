import type { ComponentType } from 'react';
import type { FluentIconsProps } from '@fluentui/react-icons';
import { useTranslation } from '@/i18n/useTranslation';
import { useFeatureCardStyles } from './FeatureCard.styles';

interface FeatureCardProps {
  icon: ComponentType<FluentIconsProps>;
  titleKey: string;
  descriptionKey: string;
}

export function FeatureCard({ icon: Icon, titleKey, descriptionKey }: FeatureCardProps) {
  const styles = useFeatureCardStyles();
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.iconContainer}>
        <Icon className={styles.icon} />
      </div>
      <h3 className={styles.title}>{t(titleKey)}</h3>
      <p className={styles.description}>{t(descriptionKey)}</p>
    </div>
  );
}
