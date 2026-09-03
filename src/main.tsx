import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { initStore } from './db/store.ts';
import { AuthProvider } from './contexts/AuthContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Vercel等の環境変数 VITE_SENTRY_DSN が設定されている場合にSentry監視を有効化
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.1,
  });
}

// Initialize mock database
initStore();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

