const LS_KEY = 'floq:suppress:predicted-meet';

type SuppressMap = Record<string, number>; // key -> expiryMs

function load(): SuppressMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as SuppressMap;
    // prune on load
    const now = Date.now();
    Object.keys(obj).forEach(k => { if (obj[k] <= now) delete obj[k]; });
    return obj;
  } catch {
    return {};
  }
}

function save(map: SuppressMap) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

let cache: SuppressMap = load();

export function shouldSuppress(key: string): boolean {
  const now = Date.now();
  const exp = cache[key];
  if (!exp) return false;
  if (exp <= now) { delete cache[key]; save(cache); return false; }
  return true;
}

export function suppress(key: string, minutes = 30) {
  const exp = Date.now() + minutes * 60_000;
  cache[key] = exp;
  save(cache);
}

export function prune() {
  const now = Date.now();
  let changed = false;
  Object.keys(cache).forEach(k => {
    if (cache[k] <= now) { delete cache[k]; changed = true; }
  });
  if (changed) save(cache);
}

/**
 * Build a stable suppression key from a convergence payload
 * friendId + ~rounded position + time bucket
 */
export function buildSuppressionKey(input: {
  friendId?: string;
  participants?: string[];
  lng: number;
  lat: number;
  timeToMeet?: number; // seconds
}) {
  const ids = (input.participants && input.participants.length > 0)
    ? [...input.participants].sort().join(',')
    : (input.friendId ?? 'unknown');

  // round to ~11m at equator (4 dp)
  const rLat = input.lat.toFixed(4);
  const rLng = input.lng.toFixed(4);
  const bucket = input.timeToMeet ? Math.floor(input.timeToMeet / 30) : 0;

  return `${ids}|${rLng},${rLat}|b${bucket}`;
}