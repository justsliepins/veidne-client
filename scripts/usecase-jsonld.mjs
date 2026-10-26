// GEO per-page JSON-LD for the homepage and the four use-case routes.
//
// The guide entries below are the source of truth for the per-page schema.
// Each graph carries the shared Organization + WebSite nodes, the one
// canonical SoftwareApplication node (@id https://veidne.com/#software), and
// the per-page WebPage node (with FAQPage on the guides only). The prerender
// driver (scripts/prerender.mjs) injects the matching graph into each
// prerendered route's <head>, replacing the id="jsonld-main" canonical graph
// from index.html.
//
// Plain .mjs (outside src/) so it is excluded from the app TypeScript project
// and from ESLint's **/*.{ts,tsx} lint scope.

export const jsonLdByPath = {
  '/': {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://veidne.com/#org',
        name: 'Veidne',
        url: 'https://veidne.com/',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://veidne.com/#website',
        url: 'https://veidne.com/',
        name: 'Veidne',
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
      },
      {
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': 'https://veidne.com/#software',
        name: 'Veidne',
        url: 'https://veidne.com/',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
        isAccessibleForFree: true,
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
        description:
          'Veidne is a free, privacy-first mail merge and bulk document generation tool that runs in the browser. Upload a Word template and an Excel spreadsheet and generate one personalized Word document per row, with no install, no account, and no code. Files are processed on your own device and are not uploaded.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        featureList: [
          'Mail merge from a Word template and an Excel spreadsheet',
          'Bulk generation of one personalized document per spreadsheet row',
          'Runs entirely in the browser, files are not uploaded',
          'No install, no account, and no code required',
          'Optional PDF export',
        ],
      },
      {
        '@type': 'WebPage',
        '@id': 'https://veidne.com/',
        url: 'https://veidne.com/',
        name: 'Free Online Mail Merge in the Browser | Veidne',
        description:
          'Free, private mail merge in the browser. Turn a Word template and an Excel file into one personalized document per row. No install, no account, no code.',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://veidne.com/#website' },
        about: { '@id': 'https://veidne.com/#software' },
        dateModified: '2026-06-10',
      },
    ],
  },
  '/free-online-mail-merge': {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://veidne.com/#org',
        name: 'Veidne',
        url: 'https://veidne.com/',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://veidne.com/#website',
        url: 'https://veidne.com/',
        name: 'Veidne',
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
      },
      {
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': 'https://veidne.com/#software',
        name: 'Veidne',
        url: 'https://veidne.com/',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
        isAccessibleForFree: true,
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
        description:
          'Veidne is a free, privacy-first mail merge and bulk document generation tool that runs in the browser. Upload a Word template and an Excel spreadsheet and generate one personalized Word document per row, with no install, no account, and no code. Files are processed on your own device and are not uploaded.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        featureList: [
          'Mail merge from a Word template and an Excel spreadsheet',
          'Bulk generation of one personalized document per spreadsheet row',
          'Runs entirely in the browser, files are not uploaded',
          'No install, no account, and no code required',
          'Optional PDF export',
        ],
      },
      {
        '@type': ['WebPage', 'FAQPage'],
        '@id': 'https://veidne.com/free-online-mail-merge',
        url: 'https://veidne.com/free-online-mail-merge',
        name: 'Free Online Mail Merge, No Word or Sign-Up | Veidne',
        description:
          'Free online mail merge in your browser. Upload a Word template and an Excel file, then generate one personalized document per row. No install, no sign-up.',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://veidne.com/#website' },
        about: { '@id': 'https://veidne.com/#software' },
        dateModified: '2026-06-10',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Is it really free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Veidne is free and funded by donations, with no account required.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are my files uploaded anywhere?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. The mail merge runs in your browser. Only the optional PDF export uses a server, and it deletes your files immediately.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need Microsoft Word or Office?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. You need a Word template and an Excel file, but you do not need Word or Office installed.',
            },
          },
          {
            '@type': 'Question',
            name: 'How many documents can I create at once?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Hundreds in a single run. The practical limit is your own device, not a paywall.',
            },
          },
          {
            '@type': 'Question',
            name: 'Will my dates and numbers keep their Excel formatting?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Veidne uses values exactly as Excel displays them, so dates stay dates, leading zeros stay, and currency keeps its symbol and separators.',
            },
          },
        ],
      },
    ],
  },

  '/generate-word-documents-from-excel': {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://veidne.com/#org',
        name: 'Veidne',
        url: 'https://veidne.com/',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://veidne.com/#website',
        url: 'https://veidne.com/',
        name: 'Veidne',
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
      },
      {
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': 'https://veidne.com/#software',
        name: 'Veidne',
        url: 'https://veidne.com/',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
        isAccessibleForFree: true,
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
        description:
          'Veidne is a free, privacy-first mail merge and bulk document generation tool that runs in the browser. Upload a Word template and an Excel spreadsheet and generate one personalized Word document per row, with no install, no account, and no code. Files are processed on your own device and are not uploaded.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        featureList: [
          'Mail merge from a Word template and an Excel spreadsheet',
          'Bulk generation of one personalized document per spreadsheet row',
          'Runs entirely in the browser, files are not uploaded',
          'No install, no account, and no code required',
          'Optional PDF export',
        ],
      },
      {
        '@type': ['WebPage', 'FAQPage'],
        '@id': 'https://veidne.com/generate-word-documents-from-excel',
        url: 'https://veidne.com/generate-word-documents-from-excel',
        name: 'Generate Word Documents From Excel, Free | Veidne',
        description:
          'Generate Word documents from Excel for free. Veidne turns each spreadsheet row into a personalized Word document in your browser, with no code or install.',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://veidne.com/#website' },
        about: { '@id': 'https://veidne.com/#software' },
        dateModified: '2026-06-10',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Which file types do I need?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A Word .docx template and an Excel .xlsx spreadsheet. Output is .docx, with optional PDF.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need to know how to code?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. Veidne is built for people who will not or cannot write a script.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I match columns to specific places in the document?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. You choose which words become fields, and each field is filled from the matching column.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does my data leave my computer?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No, the generation happens in the browser. Only optional PDF export touches a server, and it deletes files immediately.',
            },
          },
          {
            '@type': 'Question',
            name: 'Will my dates and numbers keep their Excel formatting?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Veidne uses values exactly as Excel displays them, so dates stay dates, leading zeros stay, and currency keeps its symbol and separators.',
            },
          },
        ],
      },
    ],
  },

  '/bulk-document-generation': {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://veidne.com/#org',
        name: 'Veidne',
        url: 'https://veidne.com/',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://veidne.com/#website',
        url: 'https://veidne.com/',
        name: 'Veidne',
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
      },
      {
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': 'https://veidne.com/#software',
        name: 'Veidne',
        url: 'https://veidne.com/',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
        isAccessibleForFree: true,
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
        description:
          'Veidne is a free, privacy-first mail merge and bulk document generation tool that runs in the browser. Upload a Word template and an Excel spreadsheet and generate one personalized Word document per row, with no install, no account, and no code. Files are processed on your own device and are not uploaded.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        featureList: [
          'Mail merge from a Word template and an Excel spreadsheet',
          'Bulk generation of one personalized document per spreadsheet row',
          'Runs entirely in the browser, files are not uploaded',
          'No install, no account, and no code required',
          'Optional PDF export',
        ],
      },
      {
        '@type': ['WebPage', 'FAQPage'],
        '@id': 'https://veidne.com/bulk-document-generation',
        url: 'https://veidne.com/bulk-document-generation',
        name: 'Bulk Document Generation From a Spreadsheet, Free | Veidne',
        description:
          'Bulk document generation from a spreadsheet, free and no-code. Veidne creates one personalized document per row in your browser. No install, no account.',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://veidne.com/#website' },
        about: { '@id': 'https://veidne.com/#software' },
        dateModified: '2026-06-10',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How many documents can I generate?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Hundreds in one run. The limit is your device, not a plan or a quota.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need to code or install anything?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No on both. It runs in the browser with no account.',
            },
          },
          {
            '@type': 'Question',
            name: 'What goes in and what comes out?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'In: a Word template and an Excel spreadsheet. Out: one personalized Word document per row, with optional PDF.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is my data safe?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Generation is local to your browser, and the optional PDF step deletes files at once.',
            },
          },
          {
            '@type': 'Question',
            name: 'Will my dates and numbers keep their Excel formatting?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Veidne uses values exactly as Excel displays them, so dates stay dates, leading zeros stay, and currency keeps its symbol and separators.',
            },
          },
        ],
      },
    ],
  },

  '/mail-merge-without-word': {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://veidne.com/#org',
        name: 'Veidne',
        url: 'https://veidne.com/',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://veidne.com/#website',
        url: 'https://veidne.com/',
        name: 'Veidne',
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
      },
      {
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': 'https://veidne.com/#software',
        name: 'Veidne',
        url: 'https://veidne.com/',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
        isAccessibleForFree: true,
        inLanguage: 'en',
        publisher: { '@id': 'https://veidne.com/#org' },
        description:
          'Veidne is a free, privacy-first mail merge and bulk document generation tool that runs in the browser. Upload a Word template and an Excel spreadsheet and generate one personalized Word document per row, with no install, no account, and no code. Files are processed on your own device and are not uploaded.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        featureList: [
          'Mail merge from a Word template and an Excel spreadsheet',
          'Bulk generation of one personalized document per spreadsheet row',
          'Runs entirely in the browser, files are not uploaded',
          'No install, no account, and no code required',
          'Optional PDF export',
        ],
      },
      {
        '@type': ['WebPage', 'FAQPage'],
        '@id': 'https://veidne.com/mail-merge-without-word',
        url: 'https://veidne.com/mail-merge-without-word',
        name: 'Mail Merge Without Word or Office, Free | Veidne',
        description:
          'Mail merge without Word or Office. Veidne runs in your browser, turning each spreadsheet row into a personalized document. Free, private, no install.',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://veidne.com/#website' },
        about: { '@id': 'https://veidne.com/#software' },
        dateModified: '2026-06-10',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Do I really not need Word or Office?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Correct. You need a .docx template and an .xlsx file, but no Microsoft software is required.',
            },
          },
          {
            '@type': 'Question',
            name: 'What if I do not have Word to make a template?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Use a free editor such as Google Docs or LibreOffice and save as .docx.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I open the finished documents without Word?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. They are standard .docx files that open in free editors, or you can export to PDF.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is it free and private?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes to both. It is donation-funded, needs no account, and keeps your files in the browser.',
            },
          },
          {
            '@type': 'Question',
            name: 'Will my dates and numbers keep their Excel formatting?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Veidne uses values exactly as Excel displays them, so dates stay dates, leading zeros stay, and currency keeps its symbol and separators.',
            },
          },
        ],
      },
    ],
  },
};
