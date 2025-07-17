import 'react-native-get-random-values' // Web Crypto polyfill
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { DebugProvider } from '@/lib/useDebug';
import { ErrorBoundary } from '@/components/system/ErrorBoundary'

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <DebugProvider>
      <App />
    </DebugProvider>
  </ErrorBoundary>
);

// Initialize performance monitoring after React is loaded
if (import.meta.env.DEV) {
  import('./lib/performance').then(({ initPerformanceMonitoring }) => {
    initPerformanceMonitoring();
  });
}
