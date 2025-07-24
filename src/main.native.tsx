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

// Initialize Sentry for mobile
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
if (sentryDsn) {
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: sentryDsn,
      enableInExpoDevelopment: true,
      debug: process.env.NODE_ENV === 'development',
      tracesSampleRate: 1.0,
    });
  } catch (err) {
    console.warn('Sentry native initialization failed:', err)
  }
}
// Initialize PostHog for mobile (conditional import)
const posthogKey = process.env.POSTHOG_MOBILE_KEY
if (posthogKey) {
  try {
    const posthog = require('@posthog/react-native').default;
    posthog.init(posthogKey, {
      host: 'https://eu.posthog.com',
      captureScreenViews: true,
      enableSessionRecording: false,
    })
  } catch (err) {
    console.warn('PostHog mobile not available:', err)
  }
}

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