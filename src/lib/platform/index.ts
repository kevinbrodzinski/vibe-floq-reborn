/**
 * Platform detection utilities for cross-platform compatibility
 * Supports web preview in Lovable.dev and iOS mobile app development
 */

// Platform detection
export const isWeb = typeof window !== 'undefined' && !Object.prototype.hasOwnProperty.call(window, 'ReactNativeWebView');
export const isMobile = !isWeb;
export const isIOS = isMobile && /iPad|iPhone|iPod/.test(navigator?.userAgent || '');
export const isAndroid = isMobile && /Android/.test(navigator?.userAgent || '');

// Environment detection
export const isDev = import.meta.env.MODE === 'development' || process.env.NODE_ENV === 'development';
export const isProd = import.meta.env.MODE === 'production' || process.env.NODE_ENV === 'production';
export const isPreview = typeof window !== 'undefined' && window.location.hostname.includes('lovable.dev');

// Lovable.dev specific detection
export const isLovablePreview = isPreview || (
  typeof window !== 'undefined' && 
  (window.location.hostname.includes('lovable.dev') || 
   window.location.hostname.includes('lovable-preview.dev'))
);

// Feature detection
export const hasGeolocation = typeof navigator !== 'undefined' && 'geolocation' in navigator;
export const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
export const hasLocalStorage = typeof window !== 'undefined' && 'localStorage' in window;
export const hasSessionStorage = typeof window !== 'undefined' && 'sessionStorage' in window;

// Capabilities
export const supportsWebGL = (() => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
})();

export const supportsWebWorkers = typeof Worker !== 'undefined';

// Platform-specific configurations
export const platformConfig = {
  web: {
    // Web-specific settings for Lovable.dev preview
    geolocation: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    },
    storage: {
      useSessionStorage: true,
      useLocalStorage: true
    },
    performance: {
      enableWebWorkers: supportsWebWorkers,
      enableWebGL: supportsWebGL,
      maxBatchSize: 50
    }
  },
  mobile: {
    // Mobile-specific settings for iOS app
    geolocation: {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    },
    storage: {
      useMMKV: true,
      useAsyncStorage: true
    },
    performance: {
      enableNativeOptimizations: true,
      maxBatchSize: 25
    }
  }
};

// Get current platform config
export const getCurrentPlatformConfig = () => {
  return isWeb ? platformConfig.web : platformConfig.mobile;
};

// Platform-specific storage helpers
export const getStorageAdapter = () => {
  if (isWeb) {
    return {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key) || sessionStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
          sessionStorage.setItem(key, value);
        } catch {
          // Ignore storage errors
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      }
    };
  }
  
  // Mobile storage would use MMKV or AsyncStorage
  return {
    getItem: (key: string) => null, // Implement mobile storage
    setItem: (key: string, value: string) => {}, // Implement mobile storage
    removeItem: (key: string) => {} // Implement mobile storage
  };
};

// Platform-specific logging
export const platformLog = {
  debug: (...args: any[]) => {
    if (isDev || isLovablePreview) {
      console.log('[Platform]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('[Platform]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[Platform]', ...args);
  }
};

// Export platform info for debugging
export const platformInfo = {
  isWeb,
  isMobile,
  isIOS,
  isAndroid,
  isDev,
  isProd,
  isPreview,
  isLovablePreview,
  hasGeolocation,
  hasServiceWorker,
  hasLocalStorage,
  hasSessionStorage,
  supportsWebGL,
  supportsWebWorkers,
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  config: getCurrentPlatformConfig()
};