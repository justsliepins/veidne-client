import { useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { mergeClasses } from '@fluentui/react-components';
import { NavBar } from '@/shared/components/NavBar';
import { Footer } from '@/shared/components/Footer';
import { TemplateLibrary } from '@/features/templates/components/TemplateLibrary';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { downloadTemplate } from '@/services/templateService';
import { trackEvent } from '@/services/analyticsService';
import { clearSession } from '@/features/editor/utils/sessionPersistence';
import { t } from '@/i18n/i18n';
import { usePageViewTracking } from '@/shared/hooks/usePageViewTracking';
import { useMobileKeyboard } from '@/shared/hooks/useMobileKeyboard';
import { ConsentBanner } from '@/features/consent/ConsentBanner';
import { usePageLayoutStyles } from './PageLayout.styles';

interface PageLayoutProps {
  children: ReactNode;
  navVariant?: 'light' | 'dark';
  /** Minimal editor header: logo and a quiet Report a bug link only. */
  editorNav?: boolean;
  showFooter?: boolean;
  fillViewport?: boolean;
}

export function PageLayout({
  children,
  navVariant = 'light',
  editorNav = false,
  showFooter = true,
  fillViewport = false,
}: PageLayoutProps) {
  const styles = usePageLayoutStyles();
  const navigate = useNavigate();
  usePageViewTracking();
  useMobileKeyboard();

  const handleTemplateSelect = useCallback(async (slug: string) => {
    // The editor and data stores (and with them the xlsx and docx libraries)
    // load only when a template is chosen, not with every public page. The
    // editor page loads in the same step, so it is ready to mount (and run its
    // entry reset) before the template is put into the stores below.
    const [buf, { useEditorStore }, { useDataStore }] = await Promise.all([
      downloadTemplate(slug),
      import('@/features/editor/store/editorStore'),
      import('@/features/data/store/dataStore'),
      import('@/features/editor/pages/Editor'),
    ]);
    const file = new File([buf], `${slug}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    useTemplateStore.getState().closeLibrary();
    clearSession();
    useEditorStore.getState().reset();
    useDataStore.getState().reset();
    // From a public page: the editor opens on its entry path. Inside the editor
    // (its upload step offers the library), the page is mounted and its address
    // is plain /editor already, so it stays as it is: a later reload then
    // resumes the saved project instead of clearing it (review b, finding 4).
    if (window.location.pathname !== '/editor') navigate('/editor?flow=template-data');
    setTimeout(async () => {
      await useEditorStore.getState().loadDocument(file);
      const ds = useDataStore.getState();
      const hasFields = useEditorStore.getState().placeholders.length > 0;
      if (ds.columns.length > 0 && hasFields) {
        ds.matchWithLoadedTemplate();
      } else if (hasFields) {
        ds.setPhase('excelUpload');
      } else {
        ds.setPhase('placeholders');
      }
      trackEvent('template_selected', { slug });
    }, 100);
  }, [navigate]);

  return (
    <div className={mergeClasses(styles.root, fillViewport && styles.rootConstrained)}>
      <a href="#main-content" className={styles.skipLink}>{t('a11y.skipToContent')}</a>
      {/* Shown at the bottom of the screen, but first in the reading and tab
          order after the skip link, so it is found before the page. */}
      <ConsentBanner />
      <header>
        <NavBar variant={navVariant} editor={editorNav} />
      </header>
      <main id="main-content" className={mergeClasses(styles.content, fillViewport && styles.contentConstrained)}>{children}</main>
      {showFooter && <Footer />}
      <TemplateLibrary onSelect={handleTemplateSelect} />
    </div>
  );
}
