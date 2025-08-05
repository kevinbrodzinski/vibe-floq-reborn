/**
 * ## Mapbox Integration
 * – Access token managed **only** here; never inline the string anywhere else.  
 * – Map instance stored in singleton pattern via `src/lib/geo/project.ts` (already exists).  
 * – Prefer lazy loading for map components.  
 *
 * NOTE: keep this file lightweight; NO React or browser-only code allowed.
 */

let cached: { token: string; source: 'env' | 'fallback' } | null = null;

/** Clear cache (used by FieldWebMap dev hot-reload) */
export const clearMapboxTokenCache = () => {
  cached = null;
};

/**
 * Returns a **public** Mapbox access token.
 * Cursor: feel free to import this anywhere – it is side-effect free.
 */
export async function getMapboxToken(): Promise<{ token: string; source: string }> {
  if (cached) return cached;

  /* 1️⃣  primary – .env.* variable injected by Vite/Next/Remix/etc. */
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  if (envToken) {
    cached = { token: envToken, source: 'env' };
    return cached;
  }

  /* 2️⃣  fallback – ADMIN_MAP_TOKEN baked into the repo (only for local mock) */
  cached = {
    token: 'pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtY25paHJoZzA4cnIyaW9ic2h0OTM3Z3QifQ._NbZi04NXvHoJsU12sul2A',
    source: 'fallback'
  };
  return cached;
}