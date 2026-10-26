import { useState } from 'react';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { RoadmapColumn } from '@/features/marketing/components/RoadmapColumn';
import { RoadmapCard } from '@/features/marketing/components/RoadmapCard';
import { DonationModal } from '@/features/donation/components/DonationModal';
import { useTranslation } from '@/i18n/useTranslation';
import { trackEvent } from '@/services/analyticsService';
import { useRoadmapStyles } from './Roadmap.styles';

const SHIPPED = [
  { id: 1, title: 'Document upload', description: 'Upload .docx files and view them in the browser' },
  { id: 2, title: 'Excel parsing', description: 'Upload .xlsx files and parse data columns' },
  { id: 3, title: 'Field system', description: 'Select words in documents and create named fields' },
  { id: 7, title: 'Document generation', description: 'Generate personalized documents from templates and data' },
  { id: 4, title: 'PDF export', description: 'Export generated documents as PDF files' },
];

const IN_PROGRESS = [
  { id: 8, title: 'Template library', description: 'Browse and use pre-built document templates' },
];

// Votes are not tallied in the client: a vote only sends the roadmap_voted
// analytics event and remembers the choice for this page view, so no count
// is displayed.
const VOTING = [
  { id: 5, title: 'Image fields', description: 'Support images as field values in templates' },
  { id: 6, title: 'Conditional sections', description: 'Show or hide document sections based on data values' },
];

export function Roadmap() {
  const styles = useRoadmapStyles();
  const { t } = useTranslation();
  const [voted, setVoted] = useState<ReadonlySet<number>>(() => new Set());
  const [donationOpen, setDonationOpen] = useState(false);

  const toggleVote = (id: number) => {
    trackEvent('roadmap_voted', { featureId: String(id) });
    setVoted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageLayout navVariant="light">
      <PageSeo title={t('meta.roadmap.title')} description={t('meta.roadmap.description')} path="/roadmap" />
      <div className={styles.content}>
        <h1 className={styles.title}>{t('roadmap.title')}</h1>
        <p className={styles.subtitle}>{t('roadmap.subtitle')}</p>
        <div className={styles.columns}>
          <RoadmapColumn title={t('roadmap.column.shipped')} dotColor="#22C55E">
            {SHIPPED.map((item) => (
              <RoadmapCard key={item.id} title={item.title} description={item.description} />
            ))}
          </RoadmapColumn>
          <RoadmapColumn title={t('roadmap.column.inProgress')} dotColor="#F59E0B">
            {IN_PROGRESS.map((item) => (
              <RoadmapCard key={item.id} title={item.title} description={item.description} />
            ))}
          </RoadmapColumn>
          <RoadmapColumn title={t('roadmap.column.votes')} dotColor="#46529E">
            {VOTING.map((item) => (
              <RoadmapCard
                key={item.id}
                title={item.title}
                description={item.description}
                votable
                hasVoted={voted.has(item.id)}
                onVote={() => toggleVote(item.id)}
              />
            ))}
          </RoadmapColumn>
        </div>
        <p className={styles.suggestHint}>{t('roadmap.suggestHint')}</p>
        <button type="button" className={styles.suggestBtn} onClick={() => setDonationOpen(true)}>
          {t('roadmap.suggest')}
        </button>
      </div>
      <DonationModal open={donationOpen} onClose={() => setDonationOpen(false)} surface="roadmap"
        successUrl={`${window.location.origin}/roadmap?session_id={CHECKOUT_SESSION_ID}`}
        cancelUrl={`${window.location.origin}/roadmap`} />
    </PageLayout>
  );
}
