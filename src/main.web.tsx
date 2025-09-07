// WEB-ONLY ENTRY
// This entry point is used for web development and deployment
// DO NOT import this in native code - use src/main.native.tsx instead

// 🔧 CRITICAL: Apply DataCloneError fix FIRST before any other code
import './lib/debug/consoleGuard';

// 🔧 DEBUG: Import coordinate flow testing utility
import './lib/debug/coordinateFlowTest';

// 🔧 DEBUG: Import environment configuration helper
import './lib/debug/environmentHelper';

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

// Dev-only HMR guard for sandbox stability
if (import.meta.env.DEV) {
  import('./lib/dev/hmrGuard');
}

// Initialize performance monitoring after React is loaded
if (import.meta.env.DEV) {
  // Map diagnostics helper
  import('./lib/debug/mapDiagnostics');
  
  // Map debugging helpers
  import('./lib/debug/mapDebugHelpers');
  
  // Map health monitoring
  import('./lib/debug/mapHealthCheck');
  
  import('./lib/performance').then(({ initPerformanceMonitoring }) => {
    initPerformanceMonitoring();
  });

  // Register service worker for venue caching (disabled in development)
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
}
