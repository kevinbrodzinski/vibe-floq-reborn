/**
 * ░░ Mapbox Integration – SINGLE source-of-truth for the access token ░░
 *
 * – Never inline the raw token anywhere else.
 * – Map instance is stored via `src/lib/geo/project.ts` (singleton pattern).
 * – Keep this file browser-only; no React / DOM imports here.
 */

type Source = 'env' | 'supabase' | 'fallback';
export interface MapboxTokenInfo {
  token : string;
  source: Source;
}

/*───────────────────────────────────────────────────────────────────────────✦*/
/*  In-memory cache with TTL                                                 */
/*───────────────────────────────────────────────────────────────────────────✦*/

const TTL              = 6 * 60 * 60 * 1_000;          // 6 h
let   cached: (MapboxTokenInfo & { cachedAt: number }) | null = null;

export const clearMapboxTokenCache = () => { 
  cached = null; 
  console.log('[getMapboxToken] Cache cleared for production fix');
};

const isFresh = () => cached && Date.now() - cached.cachedAt < TTL;

/*───────────────────────────────────────────────────────────────────────────✦*/
/*  Lightweight dev-only logger                                             */
/*───────────────────────────────────────────────────────────────────────────✦*/

const devLog = (...args: unknown[]) =>
  import.meta.env.MODE === 'development' && console.log('[getMapboxToken]', ...args);

/*───────────────────────────────────────────────────────────────────────────✦*/
/*  Main util                                                                */
/*───────────────────────────────────────────────────────────────────────────✦*/

export async function getMapboxToken(): Promise<MapboxTokenInfo> {
  /* SSR guard – this util must run in the browser only */
  if (typeof window === 'undefined') {
    throw new Error('getMapboxToken() should only be invoked client-side');
  }

  /* Serve from cache if still fresh */
  if (isFresh()) return { token: cached!.token, source: cached!.source };

  devLog('Fetching new access token…');

  /* ── 1️⃣  Environment variable ──────────────────────────────────────── */
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const validEnv = envToken?.startsWith('pk.') && envToken.length > 20;

  if (validEnv) {
    devLog('✓ Using token from VITE_MAPBOX_TOKEN');
    cached = { token: envToken, source: 'env', cachedAt: Date.now() };
    return { token: envToken, source: 'env' };
  }
  if (envToken) devLog('⚠️  Env token present but invalid / placeholder – ignoring.');

  /* ── 2️⃣  Supabase edge-function (only runs in browser) ─────────────── */
  try {
    devLog('→ Requesting token from /functions/v1/mapbox-token');
    const res   = await fetch('/functions/v1/mapbox-token', { method: 'GET' });
    const json  = await res.json().catch(() => null);

    if (res.ok && json?.token?.startsWith('pk.')) {
      devLog('✓ Received token from Supabase');
      cached = { token: json.token, source: 'supabase', cachedAt: Date.now() };
      return { token: json.token, source: 'supabase' };
    }
    devLog(`Supabase responded ${res.status}. Falling back.`);
  } catch (err) {
    devLog('Supabase fetch failed:', err);
  }

  /* ── 3️⃣  Hard-coded fallback – Always available ─────────────────────── */
  console.log('[getMapboxToken] PRODUCTION: Using hardcoded fallback token');
  const fallback =
    'pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtY25paHJoZzA4cnIyaW9ic2h0OTM3Z3QifQ._NbZi04NXvHoJsU12sul2A';

  devLog('⚠️  Using hardcoded fallback token.');
  cached = { token: fallback, source: 'fallback', cachedAt: Date.now() };
  return { token: fallback, source: 'fallback' };
}