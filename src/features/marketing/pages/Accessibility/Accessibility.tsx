import { LegalPage, type LegalSection } from '@/features/marketing/components/LegalPage';
import { useLegalPageStyles } from '@/features/marketing/components/LegalPage/LegalPage.styles';
import { useTranslation } from '@/i18n/useTranslation';
import { operatorParams } from '@/shared/utils/operator';

/** Known gaps, verified in the code. Remove an item in the same change that fixes it. */
const GAPS = ['gap1', 'gap2', 'gap3'] as const;

/** /accessibility: target, known gaps and contact (audit H20). Prerendered. */
export function Accessibility() {
  const s = useLegalPageStyles();
  const { t } = useTranslation();
  const texts: string[] = [];
  const params = operatorParams();
  const tx = (key: string) => { const value = t(key, params); texts.push(value); return value; };
  const p = (key: string) => <p className={s.p}>{tx(key)}</p>;
  // The complaint channel is a link once the address is real (A11Y-24).
  const contact = tx('accessibility.contact.p1');
  const at = params.email.includes('[TO FILL:') ? -1 : contact.indexOf(params.email);
  const contactP = at < 0 ? <p className={s.p}>{contact}</p> : (
    <p className={s.p}>
      {contact.slice(0, at)}
      <a className={s.link} href={`mailto:${params.email}`}>{params.email}</a>
      {contact.slice(at + params.email.length)}
    </p>
  );

  const sections: LegalSection[] = [
    {
      id: 'target', heading: tx('accessibility.target.heading'),
      body: <>{p('accessibility.target.p1')}{p('accessibility.target.p2')}</>,
    },
    {
      id: 'known-problems', heading: tx('accessibility.gaps.heading'),
      body: (
        <>
          {p('accessibility.gaps.intro')}
          <ul className={s.list}>
            {GAPS.map((g) => <li key={g}>{tx(`accessibility.gaps.${g}`)}</li>)}
          </ul>
        </>
      ),
    },
    {
      id: 'contact', heading: tx('accessibility.contact.heading'),
      body: <>{contactP}{p('accessibility.contact.p2')}</>,
    },
  ];

  return (
    <LegalPage
      seoTitle={t('meta.accessibility.title')}
      seoDescription={t('meta.accessibility.description')}
      path="/accessibility"
      heading={tx('accessibility.title')}
      lead={tx('accessibility.lead')}
      updated={tx('accessibility.updated')}
      sections={sections}
      texts={texts}
      toc={false}
    />
  );
}
