import { Component, type PropsWithChildren, type ErrorInfo } from 'react';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useStyles } from './ErrorBoundary.styles';

interface State { hasError: boolean }

function ErrorFallback() {
  const s = useStyles();
  return (
    <div className={s.root}>
      <div className={s.iconCircle}><ErrorCircleRegular /></div>
      <h1 className={s.title}>{t('error.boundary.title')}</h1>
      <p className={s.subtitle}>{t('error.boundary.subtitle')}</p>
      <button type="button" className={s.btn} onClick={() => window.location.reload()}>
        {t('error.boundary.reload')}
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}
