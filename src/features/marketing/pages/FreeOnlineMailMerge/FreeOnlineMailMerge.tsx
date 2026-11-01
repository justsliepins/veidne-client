import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { UseCaseGuide } from '@/features/marketing/components/UseCaseGuide';

export function FreeOnlineMailMerge() {
  return (
    <PageLayout navVariant="light">
      <PageSeo
        title="Free Online Mail Merge, No Word or Sign-Up"
        description="Free online mail merge in your browser. Upload a Word template and an Excel file, then generate one personalized document per row. No install, no sign-up."
        path="/free-online-mail-merge"
      />
      <UseCaseGuide
        h1="Free online mail merge"
        lastUpdated="October 2026"
        answer="Veidne is a free online mail merge tool that runs entirely in your browser. You open a Word template, click the words you want to personalize to turn them into fields, add an Excel spreadsheet, and Veidne creates one personalized Word document for every row. There is no install, no account, and your template and spreadsheet never leave your device."
        whatItIs="a browser-based mail merge for Word and Excel."
        whoItIsFor="anyone who needs many personalized documents and does not want to install software, create an account, or write code. It suits legal, HR, healthcare, education, and nonprofit work, where keeping files private matters."
        free="yes, funded by donations."
        isPrivate="the merge happens on your own device. Your template and spreadsheet never leave your device."
        steps={[
          'Open your Word (.docx) template.',
          'Click the words you want to vary, such as a name or a date, to turn them into fields.',
          'Add your Excel (.xlsx) spreadsheet, where each column matches a field and each row is one document.',
          'Generate, then download your personalized documents.',
        ]}
        extras={[
          {
            lead: 'Optional PDF export',
            text: 'if you want PDFs instead of Word files, Veidne can convert them. That single step uses a server in the EU that converts the files and deletes them straight away, without storing or sharing them.',
          },
        ]}
        faq={[
          { q: 'Is it really free?', a: 'Yes. Veidne is free and funded by donations, with no account required.' },
          { q: 'Are my files uploaded anywhere?', a: 'No. The mail merge runs in your browser. Only the optional PDF export uses a server, and it deletes your files immediately.' },
          { q: 'Do I need Microsoft Word or Office?', a: 'No. You need a Word template and an Excel file, but you do not need Word or Office installed.' },
          { q: 'How many documents can I create at once?', a: 'Hundreds in a single run. The practical limit is your own device, not a paywall.' },
          { q: 'Will my dates and numbers keep their Excel formatting?', a: "Yes. Dates stay dates, leading zeros stay, and currency keeps its symbol. Where Excel uses your computer's own style, such as 14.11.2026 or 1 234,50, you pick that style when you match your columns. Month and day names come out in English." },
        ]}
      />
    </PageLayout>
  );
}
