// Ensure window.fetch is writable even in environments where it only has a getter
try {
  if (typeof window !== 'undefined') {
    const nativeFetch = window.fetch ? window.fetch.bind(window) : undefined;
    let currentFetch = nativeFetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return currentFetch;
      },
      set(fn) {
        currentFetch = fn;
      },
      configurable: true,
      enumerable: true,
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const msg = reason ? (reason.message || String(reason)) : '';
      if (
        (reason && reason.name === 'AbortError') ||
        msg.includes('aborted') ||
        msg.includes('signal is aborted')
      ) {
        event.preventDefault();
      }
    });

    window.addEventListener('error', (event) => {
      const msg = event.message || '';
      if (msg.includes('aborted') || msg.includes('signal is aborted')) {
        event.preventDefault();
      }
    });
  }
} catch (_) {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
