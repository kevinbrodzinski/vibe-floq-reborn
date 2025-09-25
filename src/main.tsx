import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/theme.compact.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { initDevLogging } from '@/lib/map/dev/initDevLogging';
import { initFlowEventBridgeAdapters } from '@/services/eventBridgeAdapters';

// Initialize dev logging in development mode
const cleanupDevLogging = initDevLogging();

// Bridge legacy breadcrumb events to new flow events
const cleanupEventBridge = initFlowEventBridgeAdapters();

// Optional decay in development
if (import.meta.env.DEV) {
  import('./core/vibe/learning/PersonalWeightStore').then(m => m.decayPersonalDelta?.(0.995));
}

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