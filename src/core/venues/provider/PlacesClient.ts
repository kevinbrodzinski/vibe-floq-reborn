import { RateLimiter, withBackoff } from './RateLimiter';
import { getCached, setCached, getEtag, coalesce } from '../cache';
import type { ProviderResult } from '../types';

const API = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const TTL = 60_000; // 60s nearby TTL
const limiter = new RateLimiter(5, 5);  // 5 req burst / 5 rps

export async function googleNearby(lat: number, lng: number, key: string): Promise<ProviderResult | null> {
  const ck = `g:nearby:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = getCached<ProviderResult>(ck); 
  if (cached) return { ...cached, provider: 'google' };

  return coalesce(ck, async () => {
    await limiter.take();
    const url = `${API}?location=${lat},${lng}&rankby=distance&type=establishment&key=${key}`;
    const etag = getEtag(ck);
    const res = await withBackoff(() => 
      fetch(url, { headers: etag ? { 'If-None-Match': etag } : undefined })
    );
    
    if (res.status === 304 && cached) return cached;
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
      userRatings: first.user_ratings_total,
      etag: res.headers.get('ETag') ?? undefined
    };
    
    setCached(ck, out, TTL, out.etag);
    return out;
  });
}