// NATIVE-ONLY ENTRY
// This entry point is used for iOS/Android builds via Capacitor
// DO NOT import this in web code - use src/main.web.tsx instead

import 'react-native-get-random-values';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { DebugProvider } from '@/lib/useDebug';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';

// Initialize Sentry for mobile
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
if (sentryDsn) {
  try {
    // Only try to import Sentry in native environment
    if (typeof window !== 'undefined' && window.Capacitor) {
      const Sentry = require('sentry-expo');
      Sentry.init({
        dsn: sentryDsn,
        enableInExpoDevelopment: true,
        debug: process.env.NODE_ENV === 'development',
        sendDefaultPii: true,
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
        release: 'floq@1.0.0',
      });
    } else {
      console.log('[Sentry] Skipping mobile init - not in native environment');
    }
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

// Create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <DebugProvider>
        <App />
      </DebugProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// Initialize performance monitoring after React is loaded
if (import.meta.env.DEV) {
  import('./lib/performance').then(({ initPerformanceMonitoring }) => {
    initPerformanceMonitoring();
  });
}