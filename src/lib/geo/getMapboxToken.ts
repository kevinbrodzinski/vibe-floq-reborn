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
  
  // Debug: Log ALL environment variables for debugging
  console.log('[getMapboxToken] 🔍 DEBUG - All import.meta.env:', import.meta.env);

  /* 1️⃣  primary – .env.* variable injected by Vite/Next/Remix/etc. */
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  console.log('[getMapboxToken] Environment check:', { 
    hasEnvToken: !!envToken, 
    envTokenLength: envToken?.length,
    envTokenValue: envToken, // Show full value for debugging
    envTokenPrefix: envToken?.substring(0, 10)
  });
  
  // Validate token - must start with 'pk.' and not be a placeholder
  const isValidToken = envToken && 
    envToken.startsWith('pk.') && 
    !envToken.includes('your_mapbox_token_here') &&
    !envToken.includes('YOUR_MAPBOX_TOKEN') &&
    envToken.length > 20;
  
  console.log('[getMapboxToken] Token validation:', {
    isValidToken,
    startsWith_pk: envToken?.startsWith('pk.'),
    isNotPlaceholder: !envToken?.includes('your_mapbox_token_here'),
    hasCorrectLength: envToken && envToken.length > 20
  });
  
  if (isValidToken) {
    cached = { token: envToken, source: 'env' };
    console.log('[getMapboxToken] ✅ Using environment token');
    return cached;
  } else if (envToken) {
    console.log('[getMapboxToken] ⚠️ Environment token invalid/placeholder, falling back');
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