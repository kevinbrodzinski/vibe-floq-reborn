// WEB-ONLY ENTRY
// This entry point is used for web development and deployment
// DO NOT import this in native code - use src/main.native.tsx instead

// 🔒 SECURITY: Load postMessage guard first (preview only)
import '@/lib/security/postMessage-guard';

// Load debug utilities conditionally
if (import.meta.env.DEV) {
  import('./lib/debug/consoleGuard');
  import('./lib/debug/coordinateFlowTest');
  import('./lib/debug/environmentHelper');
}

// Import ResizeObserver polyfill FIRST
import 'resize-observer-polyfill/dist/ResizeObserver.global';

// Enhanced ResizeObserver polyfill with stubbed instance detection
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver || 
      (window.ResizeObserver && !window.ResizeObserver.prototype?.observe)) {
    // Handle missing or stubbed ResizeObserver (Safari/iOS content blockers)
    import('resize-observer-polyfill').then((module) => {
      (window as any).ResizeObserver = module.default;
    }).catch(() => {
      console.warn('ResizeObserver polyfill failed to load');
    });
  }
}

// Sentry removed for better Lovable compatibility

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/theme.compact.css';

// Initialize platform compatibility for Lovable.dev and mobile
import { platformInfo, platformLog } from '@/lib/platform';
import { webLocationHelpers } from '@/lib/location/webCompatibility';

// Log platform information for debugging
platformLog.debug('Platform detected:', {
  platform: platformInfo.isWeb ? 'web' : 'mobile',
  environment: platformInfo.isLovablePreview ? 'lovable-preview' : 
               platformInfo.isDev ? 'development' : 'production',
  locationAvailable: webLocationHelpers.isLocationAvailable,
  capabilities: {
    webGL: platformInfo.supportsWebGL,
    webWorkers: platformInfo.supportsWebWorkers,
    geolocation: platformInfo.hasGeolocation,
    localStorage: platformInfo.hasLocalStorage
  }
});

// Initialize web compatibility features
if (platformInfo.isLovablePreview) {
  platformLog.debug('Lovable.dev preview mode enabled with enhanced features');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Load all dev-only features after React renders
if (import.meta.env.DEV) {
  // Load debug features
  Promise.all([
    import('./lib/dev/hmrGuard'),
    import('./lib/debug/sandboxAnalyticsGuard'),
    import('./lib/debug/mapDiagnostics'),
    import('./lib/debug/mapDebugHelpers'),
    import('./lib/debug/mapHealthCheck'),
    import('./lib/performance').then(({ initPerformanceMonitoring }) => {
      initPerformanceMonitoring();
    })
  ]).catch(console.warn);
}

// Register service worker for production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
