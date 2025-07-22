import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  provider: string;
  provider_id: string;
  address?: string;
  categories: string[];
  rating?: number;
  photo_url?: string;
  updated_at: string;
  // Legacy fields for compatibility
  vibe: string;
  source: string;
  distance_m?: number;
  live_count?: number;
}

const bucket = (n: number) => Math.round(n * 1e4) / 1e4;  // 4-dp ≈ 11 m precision

// Simple in-memory cache for sync timestamps
const syncCache = new Map<string, number>();

const maybeSyncPlaces = async (lat: number, lng: number) => {
  const key = `${bucket(lat)},${bucket(lng)}`;
  const lastSync = syncCache.get(key) || 0;
  const now = Date.now();
  
  // Only sync if last sync > 15 minutes ago
  if (now - lastSync > 15 * 60 * 1000) {
    console.log(`Syncing places for ${lat},${lng} (last sync: ${Math.round((now - lastSync) / 1000)}s ago)`);
    
    try {
      await supabase.functions.invoke("sync-places", {
        body: { lat, lng }
      });
      syncCache.set(key, now);
    } catch (error) {
      console.warn('Places sync failed, continuing with cached data:', error);
      // Don't throw - use cached venues even if sync fails
    }
  } else {
    console.log(`Skipping sync for ${lat},${lng} (last sync: ${Math.round((now - lastSync) / 1000)}s ago)`);
  }
};

export const useNearbyVenues = (
  lat: number | null,
  lng: number | null,
  km = 1.2,
) => {
  return useQuery<Venue[]>({
    enabled: lat !== null && lng !== null,
    queryKey: ['nearby-venues', lat && bucket(lat), lng && bucket(lng), km],
    staleTime: 60_000,   // 1 minute
    gcTime: 120_000,     // 2 minutes (formerly cacheTime)
    retry: 1,
    queryFn: async (): Promise<Venue[]> => {
      if (lat == null || lng == null) return [];

      // Smart sync: only if needed
      await maybeSyncPlaces(lat, lng);

      const { data, error } = await supabase
        .rpc('venues_within_radius', {
          center_lat: lat,
          center_lng: lng,
          r_m: km * 1_000,
        });

      if (error) {
        console.error('Venue fetch error:', error);
        throw new Error(error.message ?? 'Venue fetch failed');
      }
      
      // Cast and map the data to include legacy fields
      const rawVenues = (data as any[]) || [];
      const venues: Venue[] = rawVenues.map(v => ({
        ...v,
        vibe: v.vibe || v.categories?.[0] || 'mixed',  // Use existing vibe or first category
        source: v.provider || 'manual',              // Map provider to source
      }));
      console.log(`Found ${venues.length} nearby venues within ${km}km`);
      return venues;
    },
  });
};