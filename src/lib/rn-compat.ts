/**
 * React Native / iOS Compatibility Layer
 * 
 * This module provides mobile-safe polyfills for Vite/web-specific APIs
 * that are not available in Hermes (React Native's JavaScript engine).
 * 
 * Use this instead of import.meta.env to ensure compatibility across
 * web and mobile builds.
 */

import { isNative } from './platform';

interface ImportMeta {
  env: Record<string, string | undefined>;
}

/**
 * Mobile-safe environment variable access
 * Replaces import.meta.env with process.env on native platforms
 */
function createEnvProxy(): ImportMeta['env'] {
  // For native builds, use process.env (available in React Native)
  if (isNative()) {
    return new Proxy(process.env as Record<string, string>, {
      get(target, prop: string) {
        // Handle common Vite environment variables
        if (prop === 'DEV') {
          return target.NODE_ENV !== 'production';
        }
        if (prop === 'PROD') {
          return target.NODE_ENV === 'production';
        }
        if (prop === 'MODE') {
          return target.NODE_ENV || 'development';
        }
        
        // Return the actual environment variable
        return target[prop];
      }
    });
  }
  
  // For web builds, use import.meta.env if available, fallback to process.env
  try {
    // @ts-ignore - import.meta may not be available in all environments
    if (typeof window !== 'undefined' && (globalThis as any).import?.meta?.env) {
      // @ts-ignore
      return (globalThis as any).import.meta.env;
    }
  } catch (e) {
    // Fallback to process.env
  }
  
  // Fallback for environments where import.meta is not available
  return new Proxy(process.env as Record<string, string>, {
    get(target, prop: string) {
      if (prop === 'DEV') {
        return target.NODE_ENV !== 'production';
      }
      if (prop === 'PROD') {
        return target.NODE_ENV === 'production';
      }
      if (prop === 'MODE') {
        return target.NODE_ENV || 'development';
      }
      
      return target[prop];
    }
  });
}

/**
 * Cross-platform environment object
 * Use this instead of import.meta.env
 */
export const env = createEnvProxy();

/**
 * Utility functions for common environment checks
 */
export const isDev = () => env.DEV === 'true' || env.NODE_ENV !== 'production';
export const isProd = () => env.PROD === 'true' || env.NODE_ENV === 'production';
export const getMode = () => env.MODE || env.NODE_ENV || 'development';

/**
 * Get environment variable with fallback
 */
export const getEnvVar = (key: string, fallback?: string): string | undefined => {
  return env[key] || fallback;
};

/**
 * Check if feature flag is enabled
 */
export const isFeatureEnabled = (flag: string): boolean => {
  const key = `VITE_FLAG_${flag.toUpperCase()}`;
  return (env[key] ?? 'false') === 'true';
};

/**
 * Get Supabase configuration from environment
 */
export const getSupabaseConfig = () => ({
  url: env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  anonKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
  edgeUrl: env.VITE_SUPABASE_EDGE_URL || env.SUPABASE_EDGE_URL,
});