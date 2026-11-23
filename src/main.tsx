import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { mark, observeVitals, recordError } from '@/app/diagnostics';
import { registerServiceWorker } from '@/app/serviceWorker';
import { applyMotionToDocument, settingsStore } from '@/app/settings';
import { installTouchGuards } from '@/app/touch';
import { installAudioUnlock } from '@/audio';
import '@/styles/fonts.css';
import '@/styles/tokens.css';
import '@/styles/base.css';

mark('boot');
observeVitals();

// Motion preference first, so the very first frame already respects it.
applyMotionToDocument(settingsStore(), document.documentElement);
installAudioUnlock(window);
installTouchGuards(window);

// Anything that slips past the error boundary is noted on the device (and nowhere else).
window.addEventListener('error', (event) => recordError('window', event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => recordError('promise', event.reason));

registerServiceWorker();

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element.');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
