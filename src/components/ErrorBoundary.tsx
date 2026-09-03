import { Component, type ReactNode, type ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CareerLog ErrorBoundary Caught]', error, errorInfo);
    // Report to Sentry
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            padding: '32px 24px',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={28} color="#EF4444" />
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>
              画面の表示中にエラーが発生しました
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              一時的なネットワーク障害やデータの不整合が考えられます。ページを再読み込みするか、しばらく時間をおいてお試しください。
            </p>

            <button
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}
            >
              <RefreshCw size={16} />
              ページを再読み込みする
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
