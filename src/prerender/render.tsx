import type { ComponentType } from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createDOMRenderer, RendererProvider, renderToStyleElements } from '@griffel/react';
import { FluentProvider } from '@fluentui/react-components';
import { veidneLightTheme } from '@/design-system/theme';
import { loadLocale } from '@/i18n/i18n';
import { Landing } from '@/features/marketing/pages/Landing';
import { FreeOnlineMailMerge } from '@/features/marketing/pages/FreeOnlineMailMerge';
import { GenerateWordDocumentsFromExcel } from '@/features/marketing/pages/GenerateWordDocumentsFromExcel';
import { BulkDocumentGeneration } from '@/features/marketing/pages/BulkDocumentGeneration';
import { MailMergeWithoutWord } from '@/features/marketing/pages/MailMergeWithoutWord';
import { About } from '@/features/marketing/pages/About';

/**
 * Browserless static prerender for the homepage and the use-case
 * guide pages.
 *
 * This module is built as a separate Vite SSR bundle (see package.json) and
 * driven by scripts/prerender.mjs, which performs the filesystem writes. Keeping
 * all the Node/fs work in the .mjs driver lets this file stay a pure React
 * module so it typechecks under tsconfig.app (browser-only types).
 *
 * Only the routes listed below are prerendered. Every other route is untouched
 * and keeps shipping as the client-rendered SPA. The app mounts with
 * createRoot (not hydrateRoot, see main.tsx), so this static markup is only the
 * initial paint for non-JS readers and crawlers: when JS loads, React
 * client-renders into #root from scratch, so there is no hydration mismatch to
 * reconcile.
 */

export interface PrerenderRoute {
  /** Route path, also used as the output directory (dist/<path>/index.html). */
  path: string;
  /** Full <title> for the prerendered HTML, verbatim from the page copy. */
  title: string;
  /** <meta name="description"> content. */
  description: string;
  Component: ComponentType;
}

export const prerenderRoutes: PrerenderRoute[] = [
  {
    path: '/',
    title: 'Free Online Mail Merge in the Browser | Veidne',
    description:
      'Free, private mail merge in the browser. Turn a Word template and an Excel file into one personalized document per row. No install, no account, no code.',
    Component: Landing,
  },
  {
    path: '/free-online-mail-merge',
    title: 'Free Online Mail Merge, No Word or Sign-Up | Veidne',
    description:
      'Free online mail merge in your browser. Upload a Word template and an Excel file, then generate one personalized document per row. No install, no sign-up.',
    Component: FreeOnlineMailMerge,
  },
  {
    path: '/generate-word-documents-from-excel',
    title: 'Generate Word Documents From Excel, Free | Veidne',
    description:
      'Generate Word documents from Excel for free. Veidne turns each spreadsheet row into a personalized Word document in your browser, with no code or install.',
    Component: GenerateWordDocumentsFromExcel,
  },
  {
    path: '/bulk-document-generation',
    title: 'Bulk Document Generation From a Spreadsheet, Free | Veidne',
    description:
      'Bulk document generation from a spreadsheet, free and no-code. Veidne creates one personalized document per row in your browser. No install, no account.',
    Component: BulkDocumentGeneration,
  },
  {
    path: '/mail-merge-without-word',
    title: 'Mail Merge Without Word or Office, Free | Veidne',
    description:
      'Mail merge without Word or Office. Veidne runs in your browser, turning each spreadsheet row into a personalized document. Free, private, no install.',
    Component: MailMergeWithoutWord,
  },
  {
    // Same title and description PageSeo sets client-side (meta.about.* in
    // en.json), so the static head matches what the SPA renders.
    path: '/about',
    title: 'About | Veidne',
    description:
      'Learn about Veidne, the free document template engine that automates mail merge and document generation from Word templates and Excel data.',
    Component: About,
  },
];

let localeLoaded = false;
async function ensureLocale(): Promise<void> {
  if (!localeLoaded) {
    await loadLocale('en');
    localeLoaded = true;
  }
}

export interface RenderedRoute {
  /** Serialized app markup to drop inside <div id="root">. */
  appHtml: string;
  /** Serialized Griffel <style> elements to inject before </head>. */
  styleHtml: string;
}

export async function renderRoute(route: PrerenderRoute): Promise<RenderedRoute> {
  await ensureLocale();

  const renderer = createDOMRenderer();
  const Component = route.Component;

  const appHtml = renderToString(
    <RendererProvider renderer={renderer}>
      <FluentProvider theme={veidneLightTheme}>
        <MemoryRouter initialEntries={[route.path]}>
          <Component />
        </MemoryRouter>
      </FluentProvider>
    </RendererProvider>,
  );

  // renderToStyleElements must run after renderToString so all rules are collected.
  const styleHtml = renderToStaticMarkup(<>{renderToStyleElements(renderer)}</>);

  return { appHtml, styleHtml };
}
