import 'react-native-get-random-values'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { DebugProvider } from '@/lib/useDebug';

createRoot(document.getElementById("root")!).render(
  <DebugProvider>
    <App />
  </DebugProvider>
);

// Initialize performance monitoring after React is loaded
if (import.meta.env.DEV) {
  import('./lib/performance').then(({ initPerformanceMonitoring }) => {
    initPerformanceMonitoring();
  });
}
