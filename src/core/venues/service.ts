import { supabase } from '@/integrations/supabase/client';
import type { VenueClass, VenueType } from './types';
import { mapCategoriesToVenueType, venueTypeToVibeDist } from './category-mapper';
import { googleNearby } from './provider/PlacesClient';
import { fsqNearby } from './provider/FoursquareClient';
import { getCached, setCached, coalesce } from './cache';
import { incrVenue } from '@/lib/telemetry/venues';

type VenuePayload = { 
  name: string | null; 
  categories: string[]; 
  confidence: number; 
  providers: string[];
  rating?: number;
  userRatings?: number;
  openNow?: boolean;
};

const CLIENT_TTL_MS = 5 * 60_000;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY ?? '';
const FSQ_KEY = import.meta.env.VITE_FSQ_API_KEY ?? '';

// 250m grid key for consistency with VenueClassifier
function gridKey(p: { lat: number; lng: number }) {
  const sz = 0.0022; // ~250m lat
  const scale = Math.max(0.25, Math.cos((p.lat * Math.PI) / 180));
  const glat = Math.round(p.lat / sz) * sz;
  const glng = Math.round((p.lng * scale) / sz) * (sz / scale);
  return `${glat.toFixed(4)},${glng.toFixed(4)}`;
}

export async function fetchVenue(lat: number, lng: number): Promise<VenuePayload> {
  const key = gridKey({ lat, lng });
  const cached = getCached<VenuePayload>(key);
  if (cached) {
    incrVenue('clientCacheHits');
    return cached;
  }

  incrVenue('venueFetch');
  return coalesce(key, async () => {
    try {
      const { data, error } = await supabase.functions.invoke('venues-proxy', {
        body: { lat, lng, gridKey: key }
      });

      if (error) throw error;

      const v: VenuePayload = data?.venue ?? { 
        name: null, 
        categories: [], 
        confidence: 0, 
        providers: [] 
      };
      
      setCached(key, v, CLIENT_TTL_MS);
      return v;
    } catch (error) {
      // Return minimal fallback
      return { 
        name: null, 
        categories: [], 
        confidence: 0, 
        providers: [] 
      };
    }
  });
}

export async function classifyVenue(lat: number, lng: number): Promise<VenueClass> {
  const results: VenueClass[] = [];
  
  if (GOOGLE_KEY) {
    try {
      const g = await googleNearby(lat, lng, GOOGLE_KEY);
      if (g?.ok) {
        const mapped = mapCategoriesToVenueType({
          googleTypes: g.types,
          fsqCategories: undefined,
          label: g.name
        });
        results.push({
          type: mapped.venueType,
          energyBase: deriveEnergyFromType(mapped.venueType),
          name: g.name,
          provider: 'google',
          distanceM: g.distanceM,
          lat: g.lat,
          lng: g.lng,
          categories: g.types,
          confidence01: mapped.confidence
        });
      }
    } catch (error) {
      console.error('Google Places error:', error);
    }
  }
  
  if (FSQ_KEY) {
    try {
      const f = await fsqNearby(lat, lng, FSQ_KEY);
      if (f?.ok) {
        const mapped = mapCategoriesToVenueType({
          googleTypes: undefined,
          fsqCategories: f.categories,
          label: f.name
        });
        results.push({
          type: mapped.venueType,
          energyBase: deriveEnergyFromType(mapped.venueType),
          name: f.name,
          provider: 'foursquare',
          distanceM: f.distanceM,
          lat: f.lat,
          lng: f.lng,
          categories: f.categories,
          confidence01: mapped.confidence
        });
      }
    } catch (error) {
      console.error('Foursquare error:', error);
    }
  }

  if (results.length > 1) {
    incrVenue('fused');
  }

  // Best merged pick
  let best = results.sort((a,b)=> b.confidence01 - a.confidence01)[0];

  // GPS fallback
  if (!best) {
    incrVenue('gpsFallback');
    best = {
      type: 'general',
      energyBase: 0.5,
      name: 'Unknown location',
      provider: 'gps',
      lat,
      lng,
      confidence01: 0.3
    };
  }

  return best;
}

function deriveEnergyFromType(vt: VenueType): number {
  const dist = venueTypeToVibeDist(vt);
  
  const energy: Record<string, number> = {
    hype: 1, energetic: 0.9, excited: 0.85, social: 0.75, flowing: 0.65, 
    open: 0.6, curious: 0.55, focused: 0.55, romantic: 0.5, chill: 0.45, 
    solo: 0.4, weird: 0.6, down: 0.3
  };
  
  let s = 0, w = 0;
  for (const [v, p] of Object.entries(dist)) { 
    const probability = Number(p) || 0;
    s += (energy[v as keyof typeof energy] ?? 0.5) * probability; 
    w += probability; 
  }
  return Number((w ? s / w : 0.5).toFixed(2));
}