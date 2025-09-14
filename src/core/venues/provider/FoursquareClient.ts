import { RateLimiter, withBackoff } from './RateLimiter';
import { getCached, setCached, coalesce } from '../cache';
import type { ProviderResult } from '../types';
import { incrVenue } from '@/lib/telemetry/venues';

const API = 'https://api.foursquare.com/v3/places/search';
const TTL = 90_000;
const limiter = new RateLimiter(5, 5);

export async function fsqNearby(lat: number, lng: number, key: string): Promise<ProviderResult | null> {
  const ck = `fsq:nearby:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = getCached<ProviderResult>(ck); 
  if (cached) {
    incrVenue('clientCacheHits');
    return { ...cached, provider: 'foursquare' };
  }

  return coalesce(ck, async () => {
    await limiter.take();
    incrVenue('fsqHits');
    const url = new URL(API);
    url.searchParams.set('ll', `${lat.toFixed(6)},${lng.toFixed(6)}`);
    url.searchParams.set('limit', '1'); 
    url.searchParams.set('radius', '120');
    
    const res = await withBackoff(() => 
      fetch(url, { 
        headers: { 
          Authorization: key, 
          Accept: 'application/json' 
        }
      })
    );
    
    if (!res.ok) return null;
    
    const json = await res.json(); 
    const first = json?.results?.[0]; 
    if (!first) return null;
    
    const out: ProviderResult = {
      ok: true, 
      provider: 'foursquare', 
      name: first.name,
      lat: first.geocodes?.main?.latitude, 
      lng: first.geocodes?.main?.longitude,
      categories: (first.categories ?? []).map((c: any) => c.name),
      distanceM: first.distance
    };
    
    setCached(ck, out, TTL); 
    return out;
  });
}