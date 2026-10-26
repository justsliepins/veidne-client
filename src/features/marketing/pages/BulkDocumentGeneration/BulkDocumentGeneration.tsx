import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { UseCaseGuide } from '@/features/marketing/components/UseCaseGuide';

export function BulkDocumentGeneration() {
  return (
    <PageLayout navVariant="light">
      <PageSeo
        title="Bulk Document Generation From a Spreadsheet, Free"
        description="Bulk document generation from a spreadsheet, free and no-code. Veidne creates one personalized document per row in your browser. No install, no account."
        path="/bulk-document-generation"
      />
      <UseCaseGuide
        h1="Bulk document generation from a spreadsheet"
        lastUpdated="June 2026"
        answer="Veidne is a free tool for bulk document generation from a spreadsheet. You upload a Word template, click words to mark where your data goes, upload an Excel file, and Veidne produces one personalized document for every row, with no code and no install. It all runs in your browser, so your files never leave your device."
        whatItIs="bulk, no-code document generation from a spreadsheet."
        whoItIsFor="non-technical people who need many documents at once and do not want to write a script. Common uses are bulk letters, certificates, invoices, and contracts. It is a good fit for legal, HR, healthcare, education, and nonprofit teams that need files to stay private."
        free="yes, funded by donations."
        isPrivate="the documents are built on your own device, not on a server."
        steps={[
          'Upload your Word (.docx) template.',
          'Click the words that should change from one document to the next to turn them into fields.',
          'Upload your Excel (.xlsx) spreadsheet. One row produces one document.',
          'Generate, then download all of your documents.',
        ]}
        extras={[
          {
            lead: 'Why not just use a script',
            text: 'a developer can write code to do this, but most people cannot, and they should not have to. Veidne gives the same bulk result with no code, and it keeps the files private by doing the work in the browser.',
          },
          {
            lead: 'Optional PDF export',
            text: 'to get PDFs, Veidne can convert the output. That one step uses a server in the EU that converts and then deletes the files immediately, with no storage or sharing.',
          },
        ]}
        faq={[
          { q: 'How many documents can I generate?', a: 'Hundreds in one run. The limit is your device, not a plan or a quota.' },
          { q: 'Do I need to code or install anything?', a: 'No on both. It runs in the browser with no account.' },
          { q: 'What goes in and what comes out?', a: 'In: a Word template and an Excel spreadsheet. Out: one personalized Word document per row, with optional PDF.' },
          { q: 'Is my data safe?', a: 'Yes. Generation is local to your browser, and the optional PDF step deletes files at once.' },
          { q: 'Will my dates and numbers keep their Excel formatting?', a: 'Yes. Veidne uses values exactly as Excel displays them, so dates stay dates, leading zeros stay, and currency keeps its symbol and separators.' },
        ]}
      />
    </PageLayout>
  );
}
