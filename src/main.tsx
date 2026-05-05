import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import type { BeforeInstallPromptEvent } from './hooks/usePwaInstall';
import './index.css';

// Chrome/Edge on Android may fire `beforeinstallprompt` before any React
// component mounts. Capture it at module load so usePwaInstall can pick it
// up later — without this, the install button in Settings rarely appears.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e as BeforeInstallPromptEvent;
});
window.addEventListener('appinstalled', () => {
  window.__deferredInstallPrompt = null;
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
