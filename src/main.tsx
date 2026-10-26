import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider } from '@fluentui/react-components';
import { veidneLightTheme } from '@/design-system/theme';
import { loadLocale } from '@/i18n/i18n';
import { App } from '@/app/App';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import '@/design-system/global.css';

loadLocale('en').then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <FluentProvider theme={veidneLightTheme}>
        <ErrorBoundary><App /></ErrorBoundary>
      </FluentProvider>
    </StrictMode>,
  );
});
