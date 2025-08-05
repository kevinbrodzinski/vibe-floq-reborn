/**
 * Mapbox token resolver (single authoritative source).
 *
 * – Checks ENV   → Supabase Edge   → local fallback.
 * – Caches the first successful token for the session.
 * – NO secret tokens are ever printed in full – only a 10-char prefix.
 */

let cached: { token: string; source: 'env' | 'supabase' | 'fallback' } | null = null;

export const clearMapboxTokenCache = () => {
  cached = null;
};

export async function getMapboxToken(): Promise<{ token: string; source: string }> {
  if (cached) return cached;

  /* ------------------------------------------------------------------ */
  /* 1️⃣ ENV                                                            */
  /* ------------------------------------------------------------------ */
  const envToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? '';
  const isValidEnvToken = envToken.startsWith('pk.') && envToken.length > 20 && !/your_mapbox_token/i.test(envToken);

  if (isValidEnvToken) {
    cached = { token: envToken, source: 'env' };
    console.info('[getMapboxToken] ✅  Loaded token from ENV (prefix %s…) ', envToken.slice(0, 10));
    return cached;
  }

  /* ------------------------------------------------------------------ */
  /* 2️⃣ Supabase Edge Function (prod)                                   */
  /* ------------------------------------------------------------------ */
  try {
    const res = await fetch('/functions/v1/mapbox-token');

    if (res.ok) {
      const json = await res.json();
      if (json?.token?.startsWith('pk.')) {
        cached = { token: json.token, source: 'supabase' };
        console.info('[getMapboxToken] ✅  Loaded token from Supabase (prefix %s…)', json.token.slice(0, 10));
        return cached;
      }
    }
    console.warn('[getMapboxToken] Supabase edge function responded with status %s', res.status);
  } catch (err) {
    console.warn('[getMapboxToken] Supabase edge call failed – continuing to fallback', err);
  }

  /* ------------------------------------------------------------------ */
  /* 3️⃣ Fallback (dev-only)                                             */
  /* ------------------------------------------------------------------ */
  const fallbackToken = 'pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtY25paHJoZzA4cnIyaW9ic2h0OTM3Z3QifQ._NbZi04NXvHoJsU12sul2A';

  if (!fallbackToken.startsWith('pk.')) {
    throw new Error('[getMapboxToken] ❌  No valid Mapbox token available');
  }

  cached = { token: fallbackToken, source: 'fallback' };
  console.info('[getMapboxToken] ⚠️  Using fallback token (dev-only)');
  return cached;
}