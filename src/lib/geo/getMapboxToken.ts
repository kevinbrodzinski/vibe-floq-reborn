/**
 * ░░ Mapbox Integration – SINGLE source-of-truth for the access token ░░
 *
 * – Never inline the raw token anywhere else.
 * – Map instance is stored via `src/lib/geo/project.ts` (singleton pattern).
 * – Keep this file browser-only; no React / DOM imports here.
 */

type TokenSource = 'env' | 'supabase' | 'fallback';
interface CachedToken {
  token: string;
  source: TokenSource;
  cachedAt: number;
}

export interface MapboxTokenInfo {
  token : string;
  source: TokenSource;
}

/*───────────────────────────────────────────────────────────────────────────✦*/
/*  In-memory cache with TTL                                                 */
/*───────────────────────────────────────────────────────────────────────────✦*/

const TTL = 1000 * 60 * 60 * 6;          // 6 h
let cached: CachedToken | null = null;

export const clearMapboxTokenCache = () => {
  if (import.meta.env.DEV) cached = null;
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

export async function getMapboxToken(): Promise<Omit<CachedToken, 'cachedAt'>> {
  if (typeof window === 'undefined') throw new Error('Browser-only util');
  if (isFresh()) return cached!;

  devLog('Fetching new access token…');

  /* ── 1️⃣  Environment variable ──────────────────────────────────────── */
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const validEnv = envToken?.startsWith('pk.') && envToken.length > 20;

  if (validEnv) {
    devLog('✓ Using token from VITE_MAPBOX_TOKEN');
    cached = { token: envToken, source: 'env', cachedAt: Date.now() };
    return { token: cached.token, source: cached.source };
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
      return { token: cached.token, source: cached.source };
    }
    devLog(`Supabase responded ${res.status}. Falling back.`);
  } catch (err) {
    devLog('Supabase fetch failed:', err);
  }

  /* ── 3️⃣  Hard-coded fallback – Dev only ─────────────────────── */
  if (import.meta.env.DEV) {
    const fallback = 'pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtY25paHJoZzA4cnIyaW9ic2h0OTM3Z3QifQ._NbZi04NXvHoJsU12sul2A';
    devLog('⚠️  Using hard-coded fallback (dev only)');
    cached = { token: fallback, source: 'fallback', cachedAt: Date.now() };
    return { token: fallback, source: 'fallback' };
  }
  throw new Error('No valid Mapbox token (env & Supabase both failed)');
}