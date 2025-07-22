import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const bucket = (n: number) => Math.round(n * 1e4) / 1e4; // 4 dp ≈ 11 m
const SYNC_COOLDOWN_MIN = 15;     // don't hit Google more often than this
const MIN_EXPECTED = 15;          // if we have fewer venues, trigger sync

/** Check sync_log to see when we last pulled Google data */
async function needsSync(kind: string, lat: number, lng: number) {
  const { data } = await supabase
    .from('sync_log')
    .select('ts')
    .eq('kind', kind)
    .order('ts', { ascending: false })
    .limit(1);

  if (!data || !data[0]) return true;
  const last = new Date(data[0].ts).getTime();
  return (Date.now() - last) / 1000 / 60 > SYNC_COOLDOWN_MIN;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  categories: string[] | null;
  rating: number | null;
  photo_url: string | null;
  lat: number;
  lng: number;
  distance_m: number;
  // Legacy fields for compatibility
  vibe: string;
  source: string;
  live_count?: number;
}

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
    queryFn: async () => {
      if (lat == null || lng == null) return [];

      /* ------------------------------------------------- deduped sync */
      if (await needsSync('google_places', lat, lng)) {
        const { error } = await supabase.functions.invoke('sync-places', {
          body: { lat, lng }
        });
        if (error) console.warn('sync-places error (ignored):', error.message);
        // record the sync so other edge calls skip
        await supabase
          .from('sync_log')
          .insert({ kind: 'google_places', lat, lng })
          .throwOnError();
      }

      /* ------------------------------------------------- query venues */
      const { data, error } = await supabase
        .rpc('venues_within_radius', {
          center_lat: lat,
          center_lng: lng,
          r_m: km * 1_000
        });

      if (error) throw new Error(error.message ?? 'Venue fetch failed');
      
      // Cast and map the data to include legacy fields
      const rawVenues = (data as any[]) || [];
      if (rawVenues.length < MIN_EXPECTED) {
        // Fire-and-forget: ask backend to refresh again
        supabase.functions.invoke('sync-places', { body: { lat, lng } });
      }
      
      const venues: Venue[] = rawVenues.map(v => ({
        ...v,
        vibe: v.vibe || v.categories?.[0] || 'mixed',  // Use existing vibe or first category
        source: v.provider || 'manual',              // Map provider to source
      }));
      console.log(`Found ${venues.length} nearby venues within ${km}km`);
      return venues;
    }
  });
};