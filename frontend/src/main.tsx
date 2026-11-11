import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/i18n';
import './shared/styles/globals.css';
import { App } from './App';

async function enableMockingIfConfigured(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK !== 'true') {
    return;
  }
  const { worker } = await import('@mocks/browser');
  await worker.start({
    onUnhandledFrame: 'bypass',
  });
}

async function bootstrap(): Promise<void> {
  await enableMockingIfConfigured();
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root container #root was not found.');
  }

  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
