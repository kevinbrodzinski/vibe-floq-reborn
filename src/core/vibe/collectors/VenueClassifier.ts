import type { VenueVibeProfile, VenueIntelligence, VenueType, DayPart } from '@/types/venues';
import { VENUE_VIBE_MAPPING, derivePopularity } from '@/types/venues';
import type { Vibe } from '@/lib/vibes';
import { supabase } from '@/integrations/supabase/client';

type LngLat = { lat: number; lng: number };
export type VenueClass = { 
  type: VenueType; 
  energy: number; 
  name?: string; 
  provider?: 'fsq'|'google'|'gps'; 
  distanceM?: number; 
};

const ORDER = String((import.meta as any).env?.VITE_PLACES_ORDER ?? 'fsq,google')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean) as Array<'fsq'|'google'>;

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

/** Coarse 250m grid cache key for consistency */
function gridKey(p: LngLat) {
  const sz = 0.0022; // ~250m lat
  const scale = Math.max(0.25, Math.cos((p.lat * Math.PI) / 180));
  const glat = Math.round(p.lat / sz) * sz;
  const glng = Math.round((p.lng * scale) / sz) * (sz / scale);
  return `${glat.toFixed(4)},${glng.toFixed(4)}`;
}

/** Enhanced energy/type mapping with strict typing */
function mapCategoriesToTypeEnergy(cats: string[]): { type: VenueType; energy: number } {
  const C = cats.map(c => c.toLowerCase());
  const has = (s: string) => C.some(x => x.includes(s));

  if (has('nightclub') || has('dance club') || has('club')) return { type: 'nightclub', energy: 0.9 };
  if (has('bar') || has('pub') || has('lounge')) return { type: 'bar', energy: 0.7 };
  if (has('coffee') || has('cafe')) return { type: 'coffee', energy: 0.6 };
  if (has('gym') || has('fitness')) return { type: 'gym', energy: 0.8 };
  if (has('park') || has('outdoor') || has('recreation')) return { type: 'park', energy: 0.4 };
  if (has('office') || has('cowork') || has('company')) return { type: 'office', energy: 0.5 };
  if (has('restaurant')) return { type: 'restaurant', energy: 0.6 };
  return { type: 'general', energy: 0.5 };
}

type ProviderHit = { name?: string; categories: string[]; distanceM?: number; provider: 'fsq'|'google' };

// Enhanced classifier using Supabase Edge Function for server-side API calls
export class VenueClassifier {
  private cache = new Map<string, VenueClass>();
  private inflight = new Map<string, Promise<VenueClass | null>>();

  async classify(p?: LngLat): Promise<VenueClass | null> {
    if (!p) return null;
    const key = gridKey(p);
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.inflight.has(key)) return this.inflight.get(key)!;

    const job = (async () => {
      try {
        // Call server-side classifier for better key management
        const { data, error } = await supabase.functions.invoke('places-classify', {
          body: { 
            lat: p.lat, 
            lng: p.lng, 
            includeRaw: import.meta.env.DEV // Only include raw categories in dev
          }
        });

        if (error) throw error;
        
        const result = data?.result;
        if (!result) throw new Error('No result from places-classify');

        const out: VenueClass = {
          type: result.type || 'general',
          energy: typeof result.energyBase === 'number' ? result.energyBase : 0.5,
          name: result.name,
          provider: 'google' // Server-side uses Google primarily
        };

        if (out) this.cache.set(key, out);
        this.inflight.delete(key);
        return out;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[VenueClassifier] Places API failed, trying GPS fallback:', error);
        }
        
        // GPS venue fallback integration
        try {
          const { getOrCreateCluster, getClusterInsights } = await import('@/core/patterns/gps-clustering');
          const cluster = await getOrCreateCluster(p.lat, p.lng, 0);
          
          if (cluster) {
            const insights = getClusterInsights(cluster);
            
            // Use cluster data for venue classification
            const fallback: VenueClass = {
              type: cluster.dominantVibe ? this.mapVibeToVenueType(cluster.dominantVibe) : 'general',
              energy: insights.isFrequentSpot ? 0.7 : 0.5,
              name: cluster.userLabel || 'Frequent spot',
              provider: 'gps',
              distanceM: 0 // At the cluster center
            };
            
            if (import.meta.env.DEV) {
              console.log('[VenueClassifier] GPS fallback successful:', {
                clusterId: cluster.id,
                type: fallback.type,
                isFrequent: insights.isFrequentSpot
              });
            }
            
            this.cache.set(key, fallback);
            this.inflight.delete(key);
            return fallback;
          }
        } catch (gpsError) {
          if (import.meta.env.DEV) {
            console.warn('[VenueClassifier] GPS fallback also failed:', gpsError);
          }
        }
        
        // Final fallback
        const fallback: VenueClass = { type: 'general', energy: 0.5 };
        this.cache.set(key, fallback);
        this.inflight.delete(key);
        return fallback;
      }
    })();

    this.inflight.set(key, job);
    return job;
  }

  // Map vibe to likely venue type for GPS fallback
  private mapVibeToVenueType(vibe: string): VenueType {
    const vibeToVenue: Record<string, VenueType> = {
      'hype': 'nightclub',
      'social': 'bar',
      'chill': 'coffee', 
      'focused': 'office',
      'flowing': 'park',
      'romantic': 'restaurant'
    };
    return vibeToVenue[vibe] || 'general';
  }
}