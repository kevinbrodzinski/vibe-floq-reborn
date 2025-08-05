// WEB-ONLY ENTRY
// This entry point is used for web development and deployment
// DO NOT import this in native code - use src/main.native.tsx instead

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

// Initialize performance monitoring after React is loaded
if (import.meta.env.DEV) {
  import('./lib/performance').then(({ initPerformanceMonitoring }) => {
    initPerformanceMonitoring();
  });
}
