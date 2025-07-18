// WEB-ONLY ENTRY
// This entry point is used for web development and deployment
// DO NOT import this in native code - use src/main.native.tsx instead

// ResizeObserver polyfill for SSR
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  // @ts-ignore
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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
