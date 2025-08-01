import { supabase } from '@/integrations/supabase/client';

export type VenueSnapshot = {
  venue_id: string;
  name: string;
  distance_m: number;
  vibe_tag: string | null;
  trend_score: number;
  people_now: number;
  last_seen_at?: string;
  dominant_vibe?: string | null;
  updated_at?: string;
};

export type VenueSyncResult = {
  ok: boolean;
  count: number;
  source: 'google' | 'foursquare' | 'sync-places';
  error?: string;
};

/* ---------- 1. fast list for map / trending ---------- */
export async function fetchTrendingVenues(
  lat: number,
  lng: number,
  radiusM = 2_000,
  limit = 15
): Promise<VenueSnapshot[]> {
  const { data, error } = await supabase.rpc('get_trending_venues', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_limit: limit
  });

  if (error) throw error;
  return (data ?? []) as VenueSnapshot[];
}

/* ---------- 2. single venue live counter ---------- */
export async function fetchVenueSnapshot(venueId: string) {
  const { data, error } = await supabase
    .from('venue_presence_snapshot')
    .select('*')
    .eq('venue_id', venueId)
    .single();

  if (error) throw error;
  return data;
}

/* ---------- 3. venue population functions ---------- */

/**
 * Sync venues from Google Places API for a specific location
 */
export async function syncGooglePlaces(
  lat: number, 
  lng: number, 
  profileId?: string
): Promise<VenueSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch_google_places', {
      body: { 
        profile_id: profileId || null,
        lat, 
        lng 
      }
    });

    if (error) throw error;
    return { ...data, source: 'google' as const };
  } catch (error) {
    console.error('Google Places sync failed:', error);
    return { 
      ok: false, 
      count: 0, 
      source: 'google' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync venues from Foursquare API for a specific location
 */
export async function syncFoursquareVenues(
  lat: number, 
  lng: number, 
  profileId?: string
): Promise<VenueSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch_foursquare', {
      body: { 
        profile_id: profileId || null,
        lat, 
        lng 
      }
    });

    if (error) throw error;
    return { ...data, source: 'foursquare' as const };
  } catch (error) {
    console.error('Foursquare sync failed:', error);
    return { 
      ok: false, 
      count: 0, 
      source: 'foursquare' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Smart venue sync that uses the universal sync-places function
 */
export async function syncNearbyVenues(
  lat: number, 
  lng: number, 
  keyword?: string
): Promise<VenueSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-places', {
      body: { lat, lng, keyword }
    });

    if (error) throw error;
    return { ...data, source: 'sync-places' as const };
  } catch (error) {
    console.error('Universal venue sync failed:', error);
    return { 
      ok: false, 
      count: 0, 
      source: 'sync-places' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if an area needs venue syncing based on sync log
 */
export async function checkSyncNeeded(lat: number, lng: number): Promise<boolean> {
  try {
    // Check if we've synced this area recently (within 1 hour)
    const { data, error } = await supabase
      .from('sync_log')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .gte('lat', lat - 0.01) // ~1km buffer
      .lte('lat', lat + 0.01)
      .gte('lng', lng - 0.01)
      .lte('lng', lng + 0.01)
      .limit(1);

    if (error) throw error;
    return !data || data.length === 0;
  } catch (error) {
    console.warn('Sync check failed, assuming sync needed:', error);
    return true;
  }
}

/**
 * Auto-sync venues if needed for a location
 */
export async function autoSyncVenues(
  lat: number, 
  lng: number, 
  profileId?: string
): Promise<VenueSyncResult[]> {
  const needsSync = await checkSyncNeeded(lat, lng);
  
  if (!needsSync) {
    return [{ ok: true, count: 0, source: 'sync-places', error: 'Already synced recently' }];
  }

  // Run both Google and Foursquare syncs in parallel
  const results = await Promise.allSettled([
    syncGooglePlaces(lat, lng, profileId),
    syncFoursquareVenues(lat, lng, profileId)
  ]);

  return results.map(result => 
    result.status === 'fulfilled' 
      ? result.value 
      : { ok: false, count: 0, source: 'google' as const, error: 'Sync failed' }
  );
}