import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker — caches app shell for offline use
registerSW({
  onOfflineReady() {
    console.log('[PWA] App ready to work offline ✅');
  },
  onNeedRefresh() {
    // Auto-reload when a new version is deployed
    void window.location.reload();
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
