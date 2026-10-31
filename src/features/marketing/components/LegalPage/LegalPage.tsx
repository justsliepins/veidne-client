import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { useTranslation } from '@/i18n/useTranslation';
import { useLegalPageStyles } from './LegalPage.styles';

/** Placeholders for facts only the operator or a lawyer can supply. While any
 *  text on the page still contains one, the page shows the draft notice, and
 *  scripts/check-legal-placeholders.mjs fails on the built HTML. */
export const PLACEHOLDER_MARK = '[TO FILL:';

export interface LegalSection {
  /** Anchor id, also the target of links such as /privacy#cookies. */
  id: string;
  heading: string;
  body: ReactNode;
}

interface LegalPageProps {
  /** meta.*.title, without the " | Veidne" suffix PageSeo adds. */
  seoTitle: string;
  seoDescription: string;
  path: string;
  heading: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
  /** Every string shown on the page, to decide whether it is still a draft. */
  texts: string[];
  /** The "On this page" list; off for short pages. */
  toc?: boolean;
}

/**
 * Layout for the privacy notice and the accessibility page: one h1, the main
 * point first, an "On this page" list, then one h2 per section. Prerendered,
 * so all of it is in the static HTML. React Router does not scroll to a hash
 * by itself, so the effect below does, and it starts at the top otherwise.
 */
export function LegalPage({ seoTitle, seoDescription, path, heading, lead, updated, sections, texts, toc = true }: LegalPageProps) {
  const s = useLegalPageStyles();
  const { t } = useTranslation();
  const { hash } = useLocation();
  const navigationType = useNavigationType();
  const isDraft = texts.some((text) => text.includes(PLACEHOLDER_MARK));

  useEffect(() => {
    // A link from another page (PUSH) starts at the top. On first load and on
    // back or forward (POP) the browser keeps its own scroll position.
    if (!hash) { if (navigationType !== 'POP') window.scrollTo(0, 0); return; }
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }, [hash, navigationType]);

  return (
    <PageLayout navVariant="light">
      <PageSeo title={seoTitle} description={seoDescription} path={path} />
      <article className={s.root}>
        <h1 className={s.title}>{heading}</h1>
        {isDraft && <p className={s.draft}>{t('legal.draftNotice')}</p>}
        <p className={s.lead}>{lead}</p>
        <p className={s.updated}>{updated}</p>
        {toc && (
          <nav className={s.toc} aria-labelledby={`${path.slice(1)}-toc`}>
            <span id={`${path.slice(1)}-toc`} className={s.tocHeading}>{t('legal.onThisPage')}</span>
            <ul className={s.tocList}>
              {sections.map((section) => (
                <li key={section.id}><a className={s.tocLink} href={`#${section.id}`}>{section.heading}</a></li>
              ))}
            </ul>
          </nav>
        )}
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id} className={s.h2} tabIndex={-1}>{section.heading}</h2>
            {section.body}
          </section>
        ))}
      </article>
    </PageLayout>
  );
}
