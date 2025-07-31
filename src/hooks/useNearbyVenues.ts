import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supaFn } from '@/lib/supaFn';

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
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await supaFn('sync-places', session.access_token, { lat, lng });
          if (res.ok) {
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
            const errorText = await res.text();
            console.warn('Places sync error:', errorText);
          }
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
        venue_id: string;
        name: string;
        address?: string;
        categories?: string[];
        rating?: number;
        photo_url?: string;
        distance_m: number;
        price_tier?: string;
        description?: string;
        live_count?: number;
        personalized_score?: number;
      }>;
      if (rawVenues.length < MIN_EXPECTED) {
        // Fire-and-forget: ask backend to refresh again
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          supaFn('sync-places', session.access_token, { lat, lng }).catch(console.warn);
        }
      }
      
      const venues: Venue[] = rawVenues.map(v => ({
        id: v.venue_id,
        name: v.name,
        address: v.address || null,
        categories: v.categories || null,
        rating: v.rating || null,
        photo_url: v.photo_url || null,
        lat: lat, // Use query parameter lat
        lng: lng, // Use query parameter lng
        distance_m: v.distance_m,
        vibe: v.categories?.[0] || 'mixed',
        source: 'manual',
        live_count: v.live_count
      }));
      console.log(`Found ${venues.length} nearby venues within ${km}km`);
      return venues;
    }
  });
};