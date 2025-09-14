import type { VenueVibeProfile, VenueIntelligence, DayPart } from '@/types/venues';
import { VENUE_VIBE_MAPPING, derivePopularity } from '@/types/venues';
import type { Vibe } from '@/lib/vibes';
import { fetchVenue } from '@/core/venues/service';
import { mapCategoriesToVenueType, vibeToVenueType, type VenueType } from '@/core/venues/category-mapper';

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

// Enhanced classifier using new venues-proxy with intelligent fusion
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
        // Use enhanced venue service with fusion & rate limiting
        const venueData = await fetchVenue(p.lat, p.lng);
        
        if (venueData.confidence > 0.3) {
          // Use canonical mapper for consistent categorization
          const mapping = mapCategoriesToVenueType({
            googleTypes: venueData.categories.filter(c => !c.includes(' ')),
            fsqCategories: venueData.categories.filter(c => c.includes(' ')),
          });
          
          const out: VenueClass = {
            type: mapping.venueType,
            energy: this.deriveEnergyFromType(mapping.venueType),
            name: venueData.name || undefined,
            provider: venueData.providers.includes('google') ? 'google' : 
                     venueData.providers.includes('fsq') ? 'fsq' : 'gps'
          };

          if (import.meta.env.DEV) {
            console.log('[VenueClassifier] Enhanced classification:', {
              venue: out.name,
              type: out.type,
              confidence: mapping.confidence,
              providers: venueData.providers
            });
          }

          this.cache.set(key, out);
          this.inflight.delete(key);
          return out;
        }

        throw new Error('Low confidence venue data');
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[VenueClassifier] Enhanced venue failed, trying GPS fallback:', error);
        }
        
        // Enhanced GPS venue fallback with canonical mapping
        try {
          const { getOrCreateCluster, getClusterInsights } = await import('@/core/patterns/gps-clustering');
          const cluster = await getOrCreateCluster(p.lat, p.lng, 0);
          
          if (cluster) {
            const insights = getClusterInsights(cluster);
            
            // Use canonical mapper for GPS clusters
            const mapping = mapCategoriesToVenueType({
              label: cluster.userLabel || cluster.dominantVibe
            });
            
            const fallback: VenueClass = {
              type: mapping.venueType !== 'general' ? mapping.venueType : 
                    cluster.dominantVibe ? vibeToVenueType(cluster.dominantVibe as Vibe) : 'general',
              energy: insights.isFrequentSpot ? 0.7 : 0.5,
              name: cluster.userLabel || 'Frequent spot',
              provider: 'gps',
              distanceM: 0
            };
            
            if (import.meta.env.DEV) {
              console.log('[VenueClassifier] Enhanced GPS fallback:', {
                clusterId: cluster.id,
                type: fallback.type,
                mapping: mapping.venueType,
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

  // Enhanced energy derivation using canonical mapping
  private deriveEnergyFromType(vt: VenueType): number {
    const energyMap: Record<VenueType, number> = {
      nightclub: 0.9, bar: 0.7, coffee: 0.6, restaurant: 0.6,
      gym: 0.8, park: 0.4, office: 0.5, school: 0.6,
      museum: 0.4, theater: 0.5, music_venue: 0.9, stadium: 0.9,
      hotel: 0.4, store: 0.5, transit: 0.3, home: 0.2, general: 0.5
    };
    return energyMap[vt] ?? 0.5;
  }

}