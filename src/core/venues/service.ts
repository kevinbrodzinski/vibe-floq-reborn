import { supabase } from '@/integrations/supabase/client';

type VenuePayload = { 
  name: string | null; 
  categories: string[]; 
  confidence: number; 
  providers: string[];
  rating?: number;
  userRatings?: number;
  openNow?: boolean;
};

const MEM = new Map<string, Promise<VenuePayload>>();
const CLIENT_TTL_MS = 5 * 60_000;
const CACHE = new Map<string, { t: number; v: VenuePayload }>();

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
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.t < CLIENT_TTL_MS) return cached.v;

  // Coalesce in-flight requests
  const inflight = MEM.get(key);
  if (inflight) return inflight;

  const p = (async () => {
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
      
      CACHE.set(key, { t: Date.now(), v });
      MEM.delete(key);
      return v;
    } catch (error) {
      MEM.delete(key);
      // Return minimal fallback
      return { 
        name: null, 
        categories: [], 
        confidence: 0, 
        providers: [] 
      };
    }
  })();

  MEM.set(key, p);
  return p;
}