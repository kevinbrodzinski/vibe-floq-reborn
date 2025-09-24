import { RateLimiter, withBackoff } from './RateLimiter';
import { getCached, setCached, coalesce } from '../cache';
import type { ProviderResult } from '../types';
import { incrVenue } from '@/lib/telemetry/venues';

const API = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const TTL = 60_000; // 60s nearby TTL
const limiter = new RateLimiter(5, 5);  // 5 req burst / 5 rps

export async function googleNearby(lat: number, lng: number, key: string): Promise<ProviderResult | null> {
  const ck = `g:nearby:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = getCached<ProviderResult>(ck); 
  if (cached) {
    incrVenue('clientCacheHits');
    return { ...cached, provider: 'google' };
  }

  return coalesce(ck, async () => {
    await limiter.take();
    incrVenue('googleHits');
    const url = `${API}?location=${lat},${lng}&rankby=distance&type=establishment&key=${key}`;
    const res = await withBackoff(() => fetch(url));
    
    if (!res.ok) return null;
    
    const json = await res.json();
    const first = json?.results?.[0]; 
    if (!first) return null;
    
    const out: ProviderResult = {
      ok: true, 
      provider: 'google', 
      name: first.name,
      lat: first.geometry?.location?.lat, 
      lng: first.geometry?.location?.lng,
      types: first.types, 
      distanceM: undefined, 
      rating: first.rating, 
      userRatings: first.user_ratings_total
    };
    
    setCached(ck, out, TTL);
    return out;
  });
}