import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initDevLogging } from '@/lib/map/dev/initDevLogging';

// Initialize dev logging in development mode
const cleanupDevLogging = initDevLogging();

// Cleanup on app unmount (optional)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupDevLogging();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);