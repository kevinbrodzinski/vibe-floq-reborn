type LngLat = { lat: number; lng: number };
export type VenueClass = { type: string; energy: number; name?: string; provider?: 'fsq'|'google'; distanceM?: number };

const ORDER = String((import.meta as any).env?.VITE_PLACES_ORDER ?? 'fsq,google')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean) as Array<'fsq'|'google'>;

const FSQ_KEY = (import.meta as any).env?.VITE_FSQ_API_KEY ?? '';
const GP_KEY  = (import.meta as any).env?.VITE_GOOGLE_PLACES_KEY ?? '';

// API resilience constants
const TIMEOUT_MS = 4500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try { 
    return await Promise.race([
      p, 
      new Promise<T>((_, rej) => ctl.signal.addEventListener('abort', () => rej(new Error('TO'))))
    ]); 
  } catch { 
    return null; 
  } finally { 
    clearTimeout(timer); 
  }
}

async function fetchSafe(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, { ...init, cache: 'no-store' });
    if (res.status === 429) { 
      await sleep(800); 
      return null; 
    }
    if (!res.ok) return null;
    return await res.json();
  } catch { 
    return null; 
  }
}

/** Coarse 250m grid cache key */
function gridKey(p: LngLat) {
  const sz = 0.0022; // ~250m lat
  const scale = Math.max(0.25, Math.cos((p.lat * Math.PI) / 180));
  const glat = Math.round(p.lat / sz) * sz;
  const glng = Math.round((p.lng * scale) / sz) * (sz / scale);
  return `${glat.toFixed(4)},${glng.toFixed(4)}`;
}

/** Energy/type mapping — extend freely */
function mapCategoriesToTypeEnergy(cats: string[]): VenueClass {
  const C = cats.map(c => c.toLowerCase());
  const has = (s: string) => C.some(x => x.includes(s));

  if (has('nightclub') || has('dance club') || has('club')) return { type: 'nightclub', energy: 0.9 };
  if (has('bar') || has('pub') || has('lounge'))           return { type: 'bar',       energy: 0.7 };
  if (has('coffee') || has('cafe'))                        return { type: 'coffee',    energy: 0.6 };
  if (has('gym') || has('fitness'))                        return { type: 'gym',       energy: 0.8 };
  if (has('park') || has('outdoor') || has('recreation'))  return { type: 'park',      energy: 0.4 };
  if (has('office') || has('cowork') || has('company'))    return { type: 'office',    energy: 0.5 };
  if (has('restaurant'))                                   return { type: 'restaurant',energy: 0.6 };
  return { type: 'general', energy: 0.5 };
}

type ProviderHit = { name?: string; categories: string[]; distanceM?: number; provider: 'fsq'|'google' };

async function fsqNear(p: LngLat): Promise<ProviderHit | null> {
  if (!FSQ_KEY) return null;
  const u = new URL('https://api.foursquare.com/v3/places/search');
  u.searchParams.set('ll', `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`);
  u.searchParams.set('limit', '1');
  u.searchParams.set('radius', '80');
  u.searchParams.set('sort', 'DISTANCE');

  const j = await withTimeout(fetchSafe(u.toString(), { 
    headers: { Authorization: FSQ_KEY, Accept: 'application/json' }
  }));
  if (!j?.results?.[0]) return null;
  
  const first = j.results[0];
  const cats = (first.categories || []).map((c: any) => c.name || '').filter(Boolean);
  const dist = first.distance ?? undefined;
  return { name: first.name, categories: cats, distanceM: dist, provider: 'fsq' };
}

async function googleNear(p: LngLat): Promise<ProviderHit | null> {
  if (!GP_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${p.lat},${p.lng}&rankby=distance&type=establishment&key=${GP_KEY}`;
  
  const j = await withTimeout(fetchSafe(url));
  if (!j?.results?.[0]) return null;
  
  const first = j.results[0];
  const cats = (first.types || []) as string[];
  return { name: first.name, categories: cats, provider: 'google' };
}

function fuse(hit: ProviderHit): VenueClass {
  const mapped = mapCategoriesToTypeEnergy(hit.categories);
  return { ...mapped, name: hit.name, provider: hit.provider, distanceM: hit.distanceM };
}

/** Merge two hits if both present: pick the "stronger" one but keep name if missing */
function pickBest(a: ProviderHit | null, b: ProviderHit | null): ProviderHit | null {
  if (a && !b) return a;
  if (!a && b) return b;
  if (!a && !b) return null;
  // prefer the one with categories that map to higher energy OR closer distance if available
  const ea = mapCategoriesToTypeEnergy(a!.categories).energy;
  const eb = mapCategoriesToTypeEnergy(b!.categories).energy;
  if (ea !== eb) return ea > eb ? a! : b!;
  // tie-breaker: distance (if any)
  if (a!.distanceM != null && b!.distanceM != null) return a!.distanceM < b!.distanceM ? a! : b!;
  // final: keep provider order preference
  const orderIndex = (p: 'fsq' | 'google') => Math.max(0, ORDER.indexOf(p));
  return orderIndex(a!.provider) <= orderIndex(b!.provider) ? a! : b!;
}

export class VenueClassifier {
  private cache = new Map<string, VenueClass>();
  private inflight = new Map<string, Promise<VenueClass | null>>();

  async classify(p?: LngLat): Promise<VenueClass | null> {
    if (!p) return null;
    const key = gridKey(p);
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.inflight.has(key)) return this.inflight.get(key)!;

    const job = (async () => {
      // Query in parallel, then fuse
      const [fsqHit, gHit] = await Promise.allSettled([fsqNear(p), googleNear(p)]);
      const a = fsqHit.status === 'fulfilled' ? fsqHit.value : null;
      const b = gHit.status === 'fulfilled' ? gHit.value : null;
      const best = pickBest(a, b);
      const out = best ? fuse(best) : null;
      if (out) this.cache.set(key, out);
      this.inflight.delete(key);
      return out;
    })();

    this.inflight.set(key, job);
    return job;
  }
}
