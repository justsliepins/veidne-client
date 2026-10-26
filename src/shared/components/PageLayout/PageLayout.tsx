import { useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { mergeClasses } from '@fluentui/react-components';
import { NavBar } from '@/shared/components/NavBar';
import { Footer } from '@/shared/components/Footer';
import { TemplateLibrary } from '@/features/templates/components/TemplateLibrary';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';
import { downloadTemplate } from '@/services/templateService';
import { trackEvent } from '@/services/analyticsService';
import { clearSession } from '@/features/editor/utils/sessionPersistence';
import { t } from '@/i18n/i18n';
import { usePageViewTracking } from '@/shared/hooks/usePageViewTracking';
import { useMobileKeyboard } from '@/shared/hooks/useMobileKeyboard';
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
    const buf = await downloadTemplate(slug);
    const file = new File([buf], `${slug}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    useTemplateStore.getState().closeLibrary();
    clearSession();
    useEditorStore.getState().reset();
    useDataStore.getState().reset();
    navigate('/editor?flow=template-data');
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
      <header>
        <NavBar variant={navVariant} editor={editorNav} />
      </header>
      <main id="main-content" className={mergeClasses(styles.content, fillViewport && styles.contentConstrained)}>{children}</main>
      {showFooter && <Footer />}
      <TemplateLibrary onSelect={handleTemplateSelect} />
    </div>
  );
}
