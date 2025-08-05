/**
 * Deno Compatibility Layer for Lovable.dev
 * Provides Node.js-like APIs using Deno equivalents
 */

// Environment variable compatibility
export const env = {
  get NODE_ENV() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('NODE_ENV') || 'development';
    }
    return (globalThis as any).process?.env?.NODE_ENV || 'development';
  },
  
  get MAPBOX_ACCESS_TOKEN() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('MAPBOX_ACCESS_TOKEN');
    }
    return (globalThis as any).process?.env?.MAPBOX_ACCESS_TOKEN;
  },
  
  get NEXT_PUBLIC_SUPABASE_URL() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
    }
    return (globalThis as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL;
  },
  
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    return (globalThis as any).process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
  
  get SUPABASE_SERVICE_ROLE_KEY() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    }
    return (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY;
  },
  
  get VITE_HMR_HOST() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('VITE_HMR_HOST');
    }
    return (globalThis as any).process?.env?.VITE_HMR_HOST;
  },
  
  get NEXT_PUBLIC_HOSTED_PREVIEW() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('NEXT_PUBLIC_HOSTED_PREVIEW');
    }
    return (globalThis as any).process?.env?.NEXT_PUBLIC_HOSTED_PREVIEW;
  },
  
  get TARGET() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('TARGET');
    }
    return (globalThis as any).process?.env?.TARGET;
  },
  
  get EXPO_PUBLIC_SENTRY_DSN() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('EXPO_PUBLIC_SENTRY_DSN');
    }
    return (globalThis as any).process?.env?.EXPO_PUBLIC_SENTRY_DSN;
  },
  
  get POSTHOG_MOBILE_KEY() {
    if (typeof Deno !== 'undefined') {
      return Deno.env.get('POSTHOG_MOBILE_KEY');
    }
    return (globalThis as any).process?.env?.POSTHOG_MOBILE_KEY;
  }
};

// Process compatibility
export const process = {
  env,
  // Add other process properties as needed
};

// Platform detection
export const isDeno = typeof Deno !== 'undefined';
export const isNode = typeof process !== 'undefined' && !isDeno;
export const isBrowser = typeof window !== 'undefined';

// Lovable.dev detection
export const isLovablePreview = 
  env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true' || 
  (typeof window !== 'undefined' && window.location.hostname.includes('lovableproject.com'));

// Runtime-specific logging
export const platformLog = {
  debug: (...args: any[]) => {
    if (isDeno) {
      console.log('[DENO]', ...args);
    } else if (isNode) {
      console.log('[NODE]', ...args);
    } else {
      console.log('[BROWSER]', ...args);
    }
  },
  info: (...args: any[]) => {
    console.info(isDeno ? '[DENO]' : isNode ? '[NODE]' : '[BROWSER]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn(isDeno ? '[DENO]' : isNode ? '[NODE]' : '[BROWSER]', ...args);
  },
  error: (...args: any[]) => {
    console.error(isDeno ? '[DENO]' : isNode ? '[NODE]' : '[BROWSER]', ...args);
  }
};

// File system compatibility (for scripts)
export const fs = {
  readFileSync: (path: string, encoding?: string) => {
    if (isDeno) {
      const decoder = new TextDecoder(encoding || 'utf-8');
      return decoder.decode(Deno.readFileSync(path));
    } else if (isNode) {
      // Node.js fallback
      return require('fs').readFileSync(path, encoding || 'utf-8');
    }
    throw new Error('File system operations not supported in browser');
  },
  
  writeFileSync: (path: string, data: string, encoding?: string) => {
    if (isDeno) {
      const encoder = new TextEncoder();
      Deno.writeFileSync(path, encoder.encode(data));
    } else if (isNode) {
      // Node.js fallback
      require('fs').writeFileSync(path, data, encoding || 'utf-8');
    } else {
      throw new Error('File system operations not supported in browser');
    }
  }
};

// Path utilities compatibility
export const path = {
  resolve: (...segments: string[]) => {
    if (isDeno) {
      return new URL(segments.join('/'), import.meta.url).pathname;
    } else if (isNode) {
      return require('path').resolve(...segments);
    }
    // Browser fallback
    return segments.join('/');
  },
  
  join: (...segments: string[]) => {
    return segments.filter(Boolean).join('/').replace(/\/+/g, '/');
  }
};

// Global polyfills for Deno compatibility
if (isDeno && typeof globalThis.process === 'undefined') {
  (globalThis as any).process = process;
}

export default {
  env,
  process,
  isDeno,
  isNode,
  isBrowser,
  isLovablePreview,
  platformLog,
  fs,
  path
};