// WEB-ONLY ENTRY
// This entry point is used for web development and deployment
// DO NOT import this in native code - use src/main.native.tsx instead

// Import ResizeObserver polyfill FIRST
import 'resize-observer-polyfill/dist/ResizeObserver.global';

// Additional SSR guard for ResizeObserver
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {

  (window as any).ResizeObserver = require('resize-observer-polyfill').default;
}

// Initialize Sentry for web
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 1.0,
      sendDefaultPii: true,
      environment: import.meta.env.DEV ? 'development' : 'production',
      release: 'floq@1.0.0',
    })
  }).catch((err) => {
    console.warn('Sentry web initialization failed:', err)
  })
}

import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { DebugProvider } from '@/lib/useDebug';
import { ErrorBoundary } from '@/components/system/ErrorBoundary'
import posthog from 'posthog-js'

// Initialize PostHog for web
const posthogKey = import.meta.env.VITE_POSTHOG_API_KEY
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: 'https://eu.posthog.com',
    autocapture: false,
    capture_pageview: false,
  })
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

// Conditional ReactQueryDevtools import for development
const ReactQueryDevtools = import.meta.env.DEV
  ? React.lazy(() => import('@tanstack/react-query-devtools').then(module => ({ default: module.ReactQueryDevtools })))
  : null;

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <DebugProvider>
        <App />
      </DebugProvider>
      {import.meta.env.DEV && ReactQueryDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </ErrorBoundary>
);

// Initialize performance monitoring after React is loaded
if (import.meta.env.DEV) {
  import('./lib/performance').then(({ initPerformanceMonitoring }) => {
    initPerformanceMonitoring();
  });
}
