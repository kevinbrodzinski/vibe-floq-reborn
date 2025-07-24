// NATIVE-ONLY ENTRY
// This entry point is used for iOS/Android builds via Capacitor
// DO NOT import this in web code - use src/main.web.tsx instead

import 'react-native-get-random-values';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DebugProvider } from '@/lib/useDebug';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { initPostHog } from '@/lib/posthog'

// Initialize PostHog
initPostHog()

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