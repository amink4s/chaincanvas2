import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Attempt explicit SDK initialization (if available)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@farcaster/miniapp-sdk');
  const fc = mod?.default || mod?.init?.() || mod;
  if (fc && typeof window !== 'undefined') {
    (window as any).farcaster = fc;
    console.log('MiniApp SDK initialized');
  }
} catch (e) {
  console.warn('Could not initialize Farcaster MiniApp SDK:', e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);