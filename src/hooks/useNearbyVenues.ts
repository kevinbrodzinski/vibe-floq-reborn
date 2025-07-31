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
    .limit(1)
    .maybeSingle();

  if (!data) return true;
  const last = new Date(data.ts).getTime();
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
    staleTime: 15_000,   // 15 seconds for fresher map markers
    gcTime: 120_000,     // 2 minutes (formerly cacheTime)
    retry: 1,
    queryFn: async () => {
      if (lat == null || lng == null) return [];

      /* ------------------------------------------------- deduped sync */
      if (await needsSync('google_places', lat, lng)) {
        const { error } = await supabase.functions.invoke('sync-places', {
          body: { lat, lng }
        });
        if (!error) {
          // Record the sync so other calls skip
          try {
            await supabase
              .from('sync_log')
              .insert({ kind: 'google_places', lat, lng });
          } catch (insertError) {
            // Ignore duplicate errors - race condition is harmless
            console.debug('Sync log insert (ignored):', insertError);
          }
        } else {
          console.warn('Places sync error:', error.message);
        }
      }

      /* ------------------------------------------------- query venues */
      const { data, error } = await supabase
        .rpc('venues_within_radius', {
          p_lat: lat,
          p_lng: lng,
          p_radius_m: km * 1_000
        });

      if (error) throw new Error(error.message ?? 'Venue fetch failed');
      
      // Cast and map the data to include legacy fields
      const rawVenues = (data || []) as Array<{
        id: string;
        name: string;
        address?: string;
        categories?: string[];
        rating?: number;
        photo_url?: string;
        lat: number;
        lng: number;
        distance_m: number;
        vibe?: string;
        provider?: string;
      }>;
      if (rawVenues.length < MIN_EXPECTED) {
        // Fire-and-forget: ask backend to refresh again
        supabase.functions.invoke('sync-places', { body: { lat, lng } });
      }
      
      const venues: Venue[] = rawVenues.map(v => ({
        ...v,
        address: v.address || null,  // Ensure address is never undefined
        categories: v.categories || null,  // Ensure categories is never undefined
        rating: v.rating || null,  // Ensure rating is never undefined
        photo_url: v.photo_url || null,  // Ensure photo_url is never undefined
        vibe: v.vibe || v.categories?.[0] || 'mixed',  // Use existing vibe or first category
        source: v.provider || 'manual',              // Map provider to source
      }));
      console.log(`Found ${venues.length} nearby venues within ${km}km`);
      return venues;
    }
  });
};