import { LegalPage, type LegalSection } from '@/features/marketing/components/LegalPage';
import { useLegalPageStyles } from '@/features/marketing/components/LegalPage/LegalPage.styles';
import { useTranslation } from '@/i18n/useTranslation';
import { operatorParams } from '@/shared/utils/operator';
import { useConsentStore } from '@/features/consent/consentStore';

const SOURCE_URL = 'https://github.com/justsliepins/veidne-client';
const SUMMARY_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5'] as const;
/** Every localStorage key the client writes (see the spec's data-flow inventory). */
const STORAGE_ROWS = [
  { name: 'veidne_consent', what: 'consent', kept: 'consentKept' },
  { name: 'veidne_first_touch', what: 'firstTouch', kept: 'withConsent' },
  { name: 'veidne_session', what: 'session', kept: 'sessionKept' },
  { name: 'veidne_formatConventions', what: 'formatConventions', kept: 'untilCleared' },
  { name: 'veidne.pdfConsent', what: 'pdfConsent', kept: 'untilCleared' },
  { name: 'veidne_field_nudge_seen', what: 'nudge', kept: 'untilCleared' },
  { name: 'veidne_rangeHintSeen', what: 'rangeHint', kept: 'untilCleared' },
  { name: 'veidne_donatedAt', what: 'donatedAt', kept: 'untilCleared' },
  { name: 'veidne_askDeclinedAt', what: 'declinedAt', kept: 'untilCleared' },
  { name: 'veidne_donateFrom', what: 'donateFrom', kept: 'untilCleared' },
] as const;
const STAT_ITEMS = ['li1', 'li2', 'li3', 'li4'] as const;

/** /privacy: the privacy notice (audit H2, with H9 and H10). Prerendered. */
export function Privacy() {
  const s = useLegalPageStyles();
  const { t } = useTranslation();
  // Collects every string the page shows, so LegalPage can tell a draft.
  // Every value gets the operator's identity and contact address as {name},
  // {regNo}, {address} and {email}; values without them are unaffected.
  const texts: string[] = [];
  const params = operatorParams();
  const tx = (key: string) => { const value = t(key, params); texts.push(value); return value; };
  const p = (key: string) => <p className={s.p}>{tx(key)}</p>;
  // The current cookie choice exists only in the browser: the prerendered
  // page has no line here, and the line updates (and is announced) when the
  // choice changes. The button opens the cookie banner again (CTA-27).
  const consentChoice = useConsentStore((st) => st.choice);
  const reopenConsent = useConsentStore((st) => st.reopen);
  const choiceKey = consentChoice === 'granted' ? 'privacyNotice.cookies.choiceGranted'
    : consentChoice === 'denied' ? 'privacyNotice.cookies.choiceDenied' : 'privacyNotice.cookies.choiceNone';
  const inBrowser = typeof window !== 'undefined';

  const sections: LegalSection[] = [
    {
      id: 'summary', heading: tx('privacyNotice.summary.heading'),
      body: (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">{tx('privacyNotice.summary.colWhat')}</th>
                <th scope="col">{tx('privacyNotice.summary.colWhere')}</th>
                <th scope="col">{tx('privacyNotice.summary.colKept')}</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_ROWS.map((r) => (
                <tr key={r}>
                  <th scope="row">{tx(`privacyNotice.summary.${r}what`)}</th>
                  <td>{tx(`privacyNotice.summary.${r}where`)}</td>
                  <td>{tx(`privacyNotice.summary.${r}kept`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'controller', heading: tx('privacyNotice.controller.heading'),
      body: <>{p('privacyNotice.controller.p1')}{p('privacyNotice.controller.p2')}</>,
    },
    {
      id: 'files', heading: tx('privacyNotice.files.heading'),
      body: (
        <>
          {p('privacyNotice.files.p1')}
          <p className={s.p}>
            {tx('privacyNotice.files.p2')}{' '}
            <a className={s.link} href={SOURCE_URL} target="_blank" rel="noopener noreferrer">{tx('privacyNotice.files.sourceLink')}</a>
          </p>
          {p('privacyNotice.files.p3')}
        </>
      ),
    },
    {
      id: 'pdf', heading: tx('privacyNotice.pdf.heading'),
      body: <>{p('privacyNotice.pdf.p1')}{p('privacyNotice.pdf.p2')}{p('privacyNotice.pdf.p3')}{p('privacyNotice.pdf.p4')}{p('privacyNotice.pdf.p5')}</>,
    },
    {
      id: 'cookies', heading: tx('privacyNotice.cookies.heading'),
      body: (
        <>
          {p('privacyNotice.cookies.p1')}
          {p('privacyNotice.cookies.p2')}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">{tx('privacyNotice.cookies.colName')}</th>
                  <th scope="col">{tx('privacyNotice.cookies.colSetBy')}</th>
                  <th scope="col">{tx('privacyNotice.cookies.colPurpose')}</th>
                  <th scope="col">{tx('privacyNotice.cookies.colLifetime')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row"><code className={s.code}>veidne_uid</code></th>
                  <td>{tx('privacyNotice.cookies.setBy')}</td>
                  <td>{tx('privacyNotice.cookies.purpose')}</td>
                  <td>{tx('privacyNotice.cookies.lifetime')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {p('privacyNotice.cookies.p3')}
          {p('privacyNotice.cookies.listIntro')}
          <ul className={s.list}>
            {STAT_ITEMS.map((li) => <li key={li}>{tx(`privacyNotice.cookies.${li}`)}</li>)}
          </ul>
          {p('privacyNotice.cookies.never')}
          {p('privacyNotice.cookies.logs')}
          {p('privacyNotice.cookies.basis')}
          {p('privacyNotice.cookies.refuse')}
          <div className={s.consentRow}>
            <p className={s.p} role="status">{inBrowser ? tx(choiceKey) : ''}</p>
            <button type="button" className={s.consentButton} onClick={reopenConsent}>{tx('privacyNotice.cookies.change')}</button>
          </div>
        </>
      ),
    },
    {
      id: 'storage', heading: tx('privacyNotice.storage.heading'),
      body: (
        <>
          {p('privacyNotice.storage.p1')}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">{tx('privacyNotice.storage.colName')}</th>
                  <th scope="col">{tx('privacyNotice.storage.colWhat')}</th>
                  <th scope="col">{tx('privacyNotice.storage.colKept')}</th>
                </tr>
              </thead>
              <tbody>
                {STORAGE_ROWS.map((row) => (
                  <tr key={row.name}>
                    <th scope="row"><code className={s.code}>{row.name}</code></th>
                    <td>{tx(`privacyNotice.storage.${row.what}`)}</td>
                    <td>{tx(`privacyNotice.storage.${row.kept}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {p('privacyNotice.storage.p2')}
        </>
      ),
    },
    {
      id: 'messages', heading: tx('privacyNotice.messages.heading'),
      body: (
        <>
          <h3 className={s.h3}>{tx('privacyNotice.messages.bug.heading')}</h3>
          {p('privacyNotice.messages.bug.p1')}
          {p('privacyNotice.messages.bug.p2')}
          <h3 className={s.h3}>{tx('privacyNotice.messages.suggest.heading')}</h3>
          {p('privacyNotice.messages.suggest.p1')}
          {p('privacyNotice.messages.suggest.p2')}
          <h3 className={s.h3}>{tx('privacyNotice.messages.donate.heading')}</h3>
          {p('privacyNotice.messages.donate.p1')}
          {p('privacyNotice.messages.donate.p2')}
          {p('privacyNotice.messages.donate.p3')}
          <h3 className={s.h3}>{tx('privacyNotice.messages.email.heading')}</h3>
          {p('privacyNotice.messages.email.p1')}
          {p('privacyNotice.messages.email.p2')}
          <h3 className={s.h3}>{tx('privacyNotice.messages.links.heading')}</h3>
          {p('privacyNotice.messages.links.p1')}
        </>
      ),
    },
    {
      id: 'recipients', heading: tx('privacyNotice.recipients.heading'),
      body: <>{p('privacyNotice.recipients.p1')}{p('privacyNotice.recipients.p2')}</>,
    },
    {
      id: 'rights', heading: tx('privacyNotice.rights.heading'),
      body: <>{p('privacyNotice.rights.p1')}{p('privacyNotice.rights.p2')}{p('privacyNotice.rights.p3')}</>,
    },
    {
      id: 'changes', heading: tx('privacyNotice.changes.heading'),
      body: p('privacyNotice.changes.p1'),
    },
  ];

  return (
    <LegalPage
      seoTitle={t('meta.privacy.title')}
      seoDescription={t('meta.privacy.description')}
      path="/privacy"
      heading={tx('privacyNotice.title')}
      lead={tx('privacyNotice.lead')}
      updated={tx('privacyNotice.updated')}
      sections={sections}
      texts={texts}
    />
  );
}
