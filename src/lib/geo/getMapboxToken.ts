/**
 * ## Mapbox Integration
 * – Access token managed **only** here; never inline the string anywhere else.  
 * – Map instance stored in singleton pattern via `src/lib/geo/project.ts` (already exists).  
 * – Prefer lazy loading for map components.  
 *
 * NOTE: keep this file lightweight; NO React or browser-only code allowed.
 */

let cached: { token: string; source: 'env' | 'fallback' | 'supabase' } | null = null;

/** Clear cache (used by FieldWebMap dev hot-reload) */
export const clearMapboxTokenCache = () => {
  cached = null;
};

/**
 * Returns a **public** Mapbox access token with robust error handling.
 * Comprehensive logging and validation for debugging map issues.
 */
export async function getMapboxToken(): Promise<{ token: string; source: string }> {
  if (cached) {
    console.log('[getMapboxToken] Using cached token:', { source: cached.source, hasToken: !!cached.token });
    return cached;
  }

  console.log('[getMapboxToken] Retrieving fresh token...');

  /* 1️⃣  primary – .env.* variable injected by Vite/Next/Remix/etc. */
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  console.log('[getMapboxToken] Environment check:', { 
    hasEnvToken: !!envToken, 
    envTokenLength: envToken?.length,
    envTokenPrefix: envToken?.substring(0, 10)
  });
  
  if (envToken && envToken.startsWith('pk.')) {
    cached = { token: envToken, source: 'env' };
    console.log('[getMapboxToken] ✅ Using environment token');
    return cached;
  }

  /* 2️⃣  Try Supabase Edge Function for production deployment */
  try {
    console.log('[getMapboxToken] Trying Supabase edge function...');
    const response = await fetch('/functions/v1/mapbox-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token && data.token.startsWith('pk.')) {
        cached = { token: data.token, source: 'supabase' };
        console.log('[getMapboxToken] ✅ Using Supabase token');
        return cached;
      }
    }
    console.log('[getMapboxToken] Supabase token unavailable, status:', response.status);
  } catch (error) {
    console.log('[getMapboxToken] Supabase token failed:', error);
  }

  /* 3️⃣  fallback – ADMIN_MAP_TOKEN baked into the repo (only for local mock) */
  const fallbackToken = 'pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtY25paHJoZzA4cnIyaW9ic2h0OTM3Z3QifQ._NbZi04NXvHoJsU12sul2A';
  
  if (!fallbackToken || !fallbackToken.startsWith('pk.')) {
    const error = 'No valid Mapbox token available - all sources failed';
    console.error('[getMapboxToken] ❌', error);
    throw new Error(error);
  }

  cached = {
    token: fallbackToken,
    source: 'fallback'
  };
  
  console.log('[getMapboxToken] ⚠️ Using fallback token (development only)');
  return cached;
}