import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { UseCaseGuide } from '@/features/marketing/components/UseCaseGuide';

export function MailMergeWithoutWord() {
  return (
    <PageLayout navVariant="light">
      <PageSeo
        title="Mail Merge Without Word or Office, Free"
        description="Mail merge without Word or Office. Veidne runs in your browser, turning each spreadsheet row into a personalized document. Free, private, no install."
        path="/mail-merge-without-word"
      />
      <UseCaseGuide
        h1="Mail merge without Word or Microsoft Office"
        lastUpdated="June 2026"
        answer="Veidne lets you run a mail merge without Microsoft Word or Office. It works in any modern browser, so you can upload a Word template and an Excel spreadsheet, generate one personalized document per row, and download the results without installing or buying anything. Your files stay on your device."
        whatItIs="a mail merge that needs no Word or Office install."
        whoItIsFor="people who do not have Word or Office, or do not want to use it, but still need personalized documents from a spreadsheet."
        free="yes, funded by donations."
        isPrivate="nothing is uploaded. The merge runs in your browser."
        steps={[
          'Upload a Word (.docx) template. You can create one in any free editor, such as Google Docs or LibreOffice, and save it as .docx.',
          'Click the words you want to personalize to turn them into fields.',
          'Upload your Excel (.xlsx) spreadsheet, one row per document.',
          'Generate and download. Open the results in any editor you like, or export them to PDF.',
        ]}
        extras={[
          {
            lead: 'Optional PDF export',
            text: 'if you prefer PDFs, Veidne can convert the documents. That step uses a server in the EU that converts and deletes them right away, without storing or sharing.',
          },
        ]}
        faq={[
          { q: 'Do I really not need Word or Office?', a: 'Correct. You need a .docx template and an .xlsx file, but no Microsoft software is required.' },
          { q: 'What if I do not have Word to make a template?', a: 'Use a free editor such as Google Docs or LibreOffice and save as .docx.' },
          { q: 'Can I open the finished documents without Word?', a: 'Yes. They are standard .docx files that open in free editors, or you can export to PDF.' },
          { q: 'Is it free and private?', a: 'Yes to both. It is donation-funded, needs no account, and keeps your files in the browser.' },
          { q: 'Will my dates and numbers keep their Excel formatting?', a: 'Yes. Veidne uses values exactly as Excel displays them, so dates stay dates, leading zeros stay, and currency keeps its symbol and separators.' },
        ]}
      />
    </PageLayout>
  );
}
