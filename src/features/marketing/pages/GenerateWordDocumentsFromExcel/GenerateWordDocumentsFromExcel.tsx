import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { UseCaseGuide } from '@/features/marketing/components/UseCaseGuide';

export function GenerateWordDocumentsFromExcel() {
  return (
    <PageLayout navVariant="light">
      <PageSeo
        title="Generate Word Documents From Excel, Free"
        description="Generate Word documents from Excel for free. Veidne turns each spreadsheet row into a personalized Word document in your browser, with no code or install."
        path="/generate-word-documents-from-excel"
      />
      <UseCaseGuide
        h1="Generate Word documents from Excel"
        lastUpdated="June 2026"
        answer="Veidne is a free tool to generate Word documents from Excel, one personalized document for each row of your spreadsheet, directly in your browser. You upload a Word template, click the words you want to fill from your data to mark them as fields, upload your Excel file, and download the finished documents. It needs no install and no account, and your files stay on your device."
        whatItIs="a tool that merges Excel rows into Word documents."
        whoItIsFor="people who keep their data in a spreadsheet and need a document per row, such as letters, certificates, invoices, or contracts, without writing code."
        free="yes, funded by donations."
        isPrivate="your spreadsheet and template never leave your browser."
        steps={[
          'Upload your Word (.docx) template.',
          'Click each word you want to pull from a spreadsheet column, for example a name, an amount, or a date, to turn it into a field.',
          'Upload your Excel (.xlsx) file. Each column maps to a field, and each row becomes one document.',
          'Generate and download. You get one personalized Word file per row.',
        ]}
        extras={[
          {
            lead: 'Optional PDF export',
            text: 'you can export the results to PDF. That step uses a server in the EU that converts the files and deletes them at once, never storing or sharing them.',
          },
        ]}
        faq={[
          { q: 'Which file types do I need?', a: 'A Word .docx template and an Excel .xlsx spreadsheet. Output is .docx, with optional PDF.' },
          { q: 'Do I need to know how to code?', a: 'No. Veidne is built for people who will not or cannot write a script.' },
          { q: 'Can I match columns to specific places in the document?', a: 'Yes. You choose which words become fields, and each field is filled from the matching column.' },
          { q: 'Does my data leave my computer?', a: 'No, the generation happens in the browser. Only optional PDF export touches a server, and it deletes files immediately.' },
          { q: 'Will my dates and numbers keep their Excel formatting?', a: 'Yes. Veidne uses values exactly as Excel displays them, so dates stay dates, leading zeros stay, and currency keeps its symbol and separators.' },
        ]}
      />
    </PageLayout>
  );
}
