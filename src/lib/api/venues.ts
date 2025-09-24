import { supabase } from '@/integrations/supabase/client';
import haversine from 'haversine-distance';
import type { VenueSyncResult } from '@/types/VenueSyncResult';

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
  photo_url?: string | null;
  rating?: number | null;
  categories?: string[] | null;
};

/* ---------- 1. fast list for map / trending ---------- */
export async function fetchTrendingVenues(
  lat: number,
  lng: number,
  radiusM = 2_000,
  limit = 15
): Promise<VenueSnapshot[]> {
  // Use bbox approach since get_trending_venues doesn't exist
  const latDegrees = radiusM / 111000;
  const lngDegrees = radiusM / (111000 * Math.cos(lat * Math.PI / 180));
  
  const { data, error } = await supabase.rpc('get_venues_in_bbox', {
    west: lng - lngDegrees,
    south: lat - latDegrees,
    east: lng + lngDegrees,
    north: lat + latDegrees
  }).select('id,name,lat,lng,vibe,source,external_id,vibe_score,live_count,updated_at,photo_url,rating,categories');

  if (error) throw error;
  
  // Transform to VenueSnapshot format - guard against invalid coordinates
  return (data ?? []).slice(0, limit)
    .filter(venue => Number.isFinite(+venue.lat) && Number.isFinite(+venue.lng))
    .map(venue => ({
      venue_id: venue.id,
      name: venue.name,
      distance_m: Math.round(haversine([lat, lng], [Number(venue.lat), Number(venue.lng)])),
      vibe_tag: venue.vibe,
      trend_score: venue.vibe_score || 50,
      people_now: venue.live_count || 0,
      dominant_vibe: venue.vibe,
      updated_at: venue.updated_at,
      photo_url: venue.photo_url,
      rating: venue.rating,
      categories: venue.categories
    }));
}

/* ---------- 2. single venue live counter ---------- */
export async function fetchVenueSnapshot(venueId: string) {
  const { data, error } = await supabase
    .from('venue_presence_snapshot')
    .select('*')
    .eq('venue_id', venueId)
    .maybeSingle(); // ✅ Fixed: use maybeSingle to avoid 406 errors

  if (error) throw error;
  return data ?? null; // graceful fallback
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
      body: { lat, lng }  // Removed profile_id requirement
    });

    if (error) throw error;
    return { ...data, source: 'google' };
  } catch (error) {
    console.error('Google Places sync failed:', error);
    return { 
      ok: false, 
      count: 0, 
      source: 'google',
      phase: 'error',
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
    // No auth needed since function is public
    const { data, error } = await supabase.functions.invoke('fetch_foursquare', {
      body: { lat, lng }
    });

    if (error) throw error;
    return { ...data, source: 'foursquare' };
  } catch (error) {
    console.error('Foursquare sync failed:', error);
    return { 
      ok: false, 
      count: 0, 
      source: 'foursquare',
      phase: 'error',
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
    return { ...data, source: 'sync-places' };
  } catch (error) {
    console.error('Universal venue sync failed:', error);
    return { 
      ok: false, 
      count: 0, 
      source: 'sync-places',
      phase: 'error',
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
 * Auto-sync venues with cascading fallback strategy
 */
export async function autoSyncVenues(
  lat: number, 
  lng: number, 
  profileId?: string
): Promise<VenueSyncResult[]> {
  const needsSync = await checkSyncNeeded(lat, lng);
  
  if (!needsSync) {
    return [{ ok: true, count: 0, source: 'sync-places', phase: 'cached', error: 'Already synced recently' }];
  }

  // Try cascading approach: Google -> Foursquare -> Universal sync
  const results: VenueSyncResult[] = [];
  
  // Try Google Places first
  const googleResult = await syncGooglePlaces(lat, lng, profileId);
  results.push(googleResult);
  
  // If Google fails or returns no results, try Foursquare
  if (!googleResult.ok || googleResult.count === 0) {
    const foursquareResult = await syncFoursquareVenues(lat, lng, profileId);
    results.push(foursquareResult);
    
    // If both fail, try universal sync as last resort
    if (!foursquareResult.ok || foursquareResult.count === 0) {
      const syncResult = await syncNearbyVenues(lat, lng);
      results.push(syncResult);
    }
  }

  return results;
}