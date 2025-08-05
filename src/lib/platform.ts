import { Capacitor } from '@capacitor/core';

/**
 * Platform detection helper
 * Use this instead of directly calling Capacitor.isNativePlatform()
 * to avoid typos and provide consistent platform detection
 */
export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    // Fallback for web environments where Capacitor might not be available
    return false;
  }
};

export const isWeb = (): boolean => !isNative();

// Constant for better tree-shaking in React Strict mode
export const IS_NATIVE = isNative();

/**
 * Detect if running in Lovable.dev preview environment
 */
export const isLovablePreview = (): boolean => {
  return typeof window !== 'undefined' && 
         (window.location.hostname === 'lovable.dev' || 
          window.location.hostname.includes('lovable.dev') ||
          import.meta.env.VITE_PREVIEW === 'true');
};

/**
 * Check if geolocation is available in the current environment
 */
export const hasGeolocation = (): boolean => {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
};

/**
 * Lightweight tagged logger that only prints in dev / preview
 */
export const platformLog = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV || import.meta.env.VITE_PREVIEW || isLovablePreview()) {
      // eslint-disable-next-line no-console
      console.log('[platform]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV || import.meta.env.VITE_PREVIEW || isLovablePreview()) {
      // eslint-disable-next-line no-console
      console.warn('[platform]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (import.meta.env.DEV || import.meta.env.VITE_PREVIEW || isLovablePreview()) {
      // eslint-disable-next-line no-console
      console.error('[platform]', ...args);
    }
  }
};

/**
 * Platform information object for debugging and feature detection
 */
export const platformInfo = {
  isWeb: isWeb(),
  isNative: isNative(),
  isLovablePreview: isLovablePreview(),
  isDev: import.meta.env.DEV || import.meta.env.MODE === 'development',
  hasGeolocation: hasGeolocation(),
  hasLocalStorage: typeof window !== 'undefined' && 'localStorage' in window,
  supportsWebGL: typeof window !== 'undefined' && !!window.WebGLRenderingContext,
  supportsWebWorkers: typeof Worker !== 'undefined'
};

export const platform = {
  isNative,
  isWeb,
  IS_NATIVE,
  getPlatform: () => isNative() ? 'native' : 'web'
};

// Add missing exports for backward compatibility
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function getCurrentPlatformConfig() {
  return {
    isMobile: isMobile(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isWeb: !isMobile(),
  };
}