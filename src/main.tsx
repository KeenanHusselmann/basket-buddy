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
    // New version detected — reload immediately to apply it
    void window.location.reload();
  },
  onRegistered(registration) {
    if (!registration) return;
    // Poll for updates every 60 s so mobile home-screen installs pick up
    // new deployments without waiting for the browser's default 24 h cycle.
    setInterval(() => {
      registration.update().catch(() => {});
    }, 60 * 1000);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
