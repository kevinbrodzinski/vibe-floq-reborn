import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initDevLogging } from '@/lib/map/dev/initDevLogging';
import { initFlowEventBridgeAdapters } from '@/services/eventBridgeAdapters';

// Initialize dev logging in development mode
const cleanupDevLogging = initDevLogging();

// Bridge legacy breadcrumb events to new flow events
const cleanupEventBridge = initFlowEventBridgeAdapters();

// Cleanup on app unmount (optional)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupDevLogging();
    cleanupEventBridge();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);