import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spinner } from '@fluentui/react-components';

const Landing = lazy(() => import('@/features/marketing/pages/Landing').then((m) => ({ default: m.Landing })));
const About = lazy(() => import('@/features/marketing/pages/About').then((m) => ({ default: m.About })));
const Roadmap = lazy(() => import('@/features/marketing/pages/Roadmap').then((m) => ({ default: m.Roadmap })));
const Editor = lazy(() => import('@/features/editor/pages/Editor').then((m) => ({ default: m.Editor })));
const NotFound = lazy(() => import('@/features/marketing/pages/NotFound').then((m) => ({ default: m.NotFound })));
const ThankYou = lazy(() => import('@/features/donation/pages/ThankYou').then((m) => ({ default: m.ThankYou })));

// GEO step 1: answer-first use-case guide pages, prerendered to static HTML at build time.
const FreeOnlineMailMerge = lazy(() => import('@/features/marketing/pages/FreeOnlineMailMerge').then((m) => ({ default: m.FreeOnlineMailMerge })));
const GenerateWordDocumentsFromExcel = lazy(() => import('@/features/marketing/pages/GenerateWordDocumentsFromExcel').then((m) => ({ default: m.GenerateWordDocumentsFromExcel })));
const BulkDocumentGeneration = lazy(() => import('@/features/marketing/pages/BulkDocumentGeneration').then((m) => ({ default: m.BulkDocumentGeneration })));
const MailMergeWithoutWord = lazy(() => import('@/features/marketing/pages/MailMergeWithoutWord').then((m) => ({ default: m.MailMergeWithoutWord })));

// Dev-only PDF E2E seed route. The import.meta.env.DEV guard is statically false
// in production builds, so the lazy import is dead code and Rollup drops the
// chunk entirely (no /dev surface ships).
const DevPdfDone = import.meta.env.DEV ? lazy(() => import('@/dev/DevPdfDone')) : null;

function Fallback() {
  return <Spinner size="medium" />;
}

function LazyRoute({ Component }: { Component: React.LazyExoticComponent<React.ComponentType> }) {
  return (
    <Suspense fallback={<Fallback />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <LazyRoute Component={Landing} /> },
  { path: '/about', element: <LazyRoute Component={About} /> },
  // The start matrix is gone: /start is the editor's upload step. Kept as a
  // redirect so every published link into /start still lands there.
  { path: '/start', element: <Navigate to="/editor" replace /> },
  { path: '/roadmap', element: <LazyRoute Component={Roadmap} /> },
  { path: '/thank-you', element: <LazyRoute Component={ThankYou} /> },
  { path: '/editor', element: <LazyRoute Component={Editor} /> },
  { path: '/free-online-mail-merge', element: <LazyRoute Component={FreeOnlineMailMerge} /> },
  { path: '/generate-word-documents-from-excel', element: <LazyRoute Component={GenerateWordDocumentsFromExcel} /> },
  { path: '/bulk-document-generation', element: <LazyRoute Component={BulkDocumentGeneration} /> },
  { path: '/mail-merge-without-word', element: <LazyRoute Component={MailMergeWithoutWord} /> },
  ...(DevPdfDone
    ? [{ path: '/dev/pdf-done', element: <LazyRoute Component={DevPdfDone} /> }]
    : []),
  { path: '*', element: <LazyRoute Component={NotFound} /> },
]);
