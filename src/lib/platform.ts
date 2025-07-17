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

export const platform = {
  isNative,
  isWeb,
  getPlatform: () => isNative() ? 'native' : 'web'
};