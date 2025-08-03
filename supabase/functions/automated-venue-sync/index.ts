import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { corsHeaders, respondWithCors } from "../_shared/cors.ts";
import { mapToVenue, upsertVenues, logVenueDrop } from "../_shared/venues.ts";
import { withRetry } from "../_shared/retry.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

interface VenueSource {
  name: string;
  priority: number;
  fetchFn: (lat: number, lng: number) => Promise<any[]>;
}

interface SyncRequest {
  lat: number;
  lng: number;
  radius?: number;
  profile_id?: string;
  force_refresh?: boolean;
  sources?: string[];
}

interface SyncResult {
  ok: boolean;
  total_venues: number;
  new_venues: number;
  updated_venues: number;
  deduplicated: number;
  sources_used: string[];
  sync_time_ms: number;
  errors: string[];
}

const SYNC_COOLDOWN_MINUTES = 15;
const DEFAULT_RADIUS = 1500;
const MAX_VENUES_PER_SOURCE = 50;

// Venue source implementations
const venueSources: Record<string, VenueSource> = {
  google: {
    name: "Google Places",
    priority: 1,
    fetchFn: async (lat: number, lng: number) => {
      const API_KEY = Deno.env.get("GOOGLE_PLACES_KEY");
      if (!API_KEY) throw new Error("Google Places API key not configured");

      // Try new Places API first
      try {
        const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.rating,places.types,places.photos,places.priceLevel,places.formattedAddress"
          },
          body: JSON.stringify({
            includedTypes: ["restaurant", "bar", "cafe", "tourist_attraction", "shopping_mall", "gym"],
            maxResultCount: MAX_VENUES_PER_SOURCE,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: DEFAULT_RADIUS
              }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          return (data.places || []).map((place: any) => ({
            place_id: place.id,
            name: place.displayName?.text || "Unknown Place",
            types: place.types || [],
            rating: place.rating,
            price_level: place.priceLevel,
            vicinity: place.formattedAddress,
            geometry: {
              location: {
                lat: place.location?.latitude || lat,
                lng: place.location?.longitude || lng
              }
            },
            photos: place.photos ? [{
              photo_reference: place.photos[0]?.name?.split("/")[3]
            }] : []
          }));
        }
      } catch (error) {
        console.warn("[AutoSync] New Google Places API failed, trying legacy:", error);
      }

      // Fallback to legacy API
      const legacyUrl = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      legacyUrl.searchParams.set("location", `${lat},${lng}`);
      legacyUrl.searchParams.set("radius", String(DEFAULT_RADIUS));
      legacyUrl.searchParams.set("key", API_KEY);
      legacyUrl.searchParams.set("type", "point_of_interest");

      const legacyResponse = await fetch(legacyUrl);
      if (!legacyResponse.ok) {
        throw new Error(`Google Places legacy API error: ${legacyResponse.status}`);
      }

      const legacyData = await legacyResponse.json();
      if (legacyData.status !== "OK" && legacyData.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places API error: ${legacyData.status}`);
      }

      return legacyData.results || [];
    }
  },

  foursquare: {
    name: "Foursquare",
    priority: 2,
    fetchFn: async (lat: number, lng: number) => {
      const API_KEY = Deno.env.get("FSQ_SERVICE_KEY");
      if (!API_KEY) throw new Error("Foursquare API key not configured");

      const url = `https://api.foursquare.com/v3/places/nearby?ll=${lat},${lng}&radius=${DEFAULT_RADIUS}&limit=${MAX_VENUES_PER_SOURCE}`;
      
      const response = await fetch(url, {
        headers: { 
          Accept: "application/json", 
          Authorization: API_KEY 
        },
      });

      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.message) {
        throw new Error(`Foursquare API error: ${data.message}`);
      }

      return data.results || [];
    }
  }
};

// Deduplication logic
function deduplicateVenues(venues: any[]): { venues: any[], duplicates: number } {
  const seen = new Map<string, any>();
  const duplicates: any[] = [];
  
  for (const venue of venues) {
    // Create a normalized key for deduplication
    const name = venue.name?.toLowerCase().trim();
    const lat = Math.round((venue.lat || 0) * 10000) / 10000; // 4 decimal precision
    const lng = Math.round((venue.lng || 0) * 10000) / 10000;
    const key = `${name}:${lat}:${lng}`;
    
    if (seen.has(key)) {
      // Keep the venue with more data (higher priority source)
      const existing = seen.get(key);
      if (venue.source === 'google' && existing.source === 'foursquare') {
        duplicates.push(existing);
        seen.set(key, venue);
      } else {
        duplicates.push(venue);
      }
    } else {
      seen.set(key, venue);
    }
  }
  
  return {
    venues: Array.from(seen.values()),
    duplicates: duplicates.length
  };
}

// Check if sync is needed
async function checkSyncNeeded(lat: number, lng: number, forceRefresh: boolean): Promise<boolean> {
  if (forceRefresh) return true;
  
  const cutoff = new Date(Date.now() - SYNC_COOLDOWN_MINUTES * 60 * 1000);
  
  const { data, error } = await supabase
    .from('sync_log')
    .select('created_at')
    .eq('kind', 'automated_venue_sync')
    .gte('lat', lat - 0.01)
    .lte('lat', lat + 0.01)
    .gte('lng', lng - 0.01)
    .lte('lng', lng + 0.01)
    .gte('created_at', cutoff.toISOString())
    .limit(1);

  if (error) {
    console.warn("[AutoSync] Sync check failed, assuming sync needed:", error);
    return true;
  }

  return !data || data.length === 0;
}

// Log sync attempt
async function logSyncAttempt(lat: number, lng: number, result: SyncResult) {
  try {
    await supabase.from('sync_log').insert({
      kind: 'automated_venue_sync',
      lat,
      lng,
      metadata: {
        result,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.warn("[AutoSync] Failed to log sync attempt:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: { ...corsHeaders, "Content-Length": "0" } 
    });
  }
  
  if (req.method !== "POST") {
    return respondWithCors({ error: "Method not allowed" }, 405);
  }

  const startTime = Date.now();
  let result: SyncResult = {
    ok: false,
    total_venues: 0,
    new_venues: 0,
    updated_venues: 0,
    deduplicated: 0,
    sources_used: [],
    sync_time_ms: 0,
    errors: []
  };

  try {
    const request: SyncRequest = await req.json();
    const { lat, lng, force_refresh = false, sources = ['google', 'foursquare'] } = request;

    console.log(`[AutoSync] Starting automated sync for ${lat},${lng}`);

    // Validate coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Invalid coordinates provided");
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Coordinates out of valid range");
    }

    // Check if sync is needed
    const syncNeeded = await checkSyncNeeded(lat, lng, force_refresh);
    if (!syncNeeded) {
      result.ok = true;
      result.sync_time_ms = Date.now() - startTime;
      result.errors.push("Sync skipped - recently synced");
      
      await logSyncAttempt(lat, lng, result);
      return respondWithCors({
        ...result,
        message: "Area recently synced, skipping"
      });
    }

    // Fetch venues from all requested sources
    const allVenues: any[] = [];
    const sourcesUsed: string[] = [];

    for (const sourceName of sources) {
      const source = venueSources[sourceName];
      if (!source) {
        result.errors.push(`Unknown source: ${sourceName}`);
        continue;
      }

      try {
        console.log(`[AutoSync] Fetching from ${source.name}...`);
        
        const rawVenues = await withRetry(async () => {
          return await source.fetchFn(lat, lng);
        }, { attempts: 2, backoffMs: 1000 });

        // Transform venues
        const transformedVenues = rawVenues.map((venue: any) => {
          try {
            const mapped = mapToVenue({ 
              provider: sourceName, 
              r: venue 
            });
            return mapped ? { ...mapped, source: sourceName } : null;
          } catch (error) {
            console.error(`[AutoSync] Failed to map venue from ${sourceName}:`, error);
            return null;
          }
        }).filter(Boolean);

        allVenues.push(...transformedVenues);
        sourcesUsed.push(sourceName);
        
        console.log(`[AutoSync] ${source.name}: ${transformedVenues.length} venues`);
      } catch (error) {
        const errorMsg = `${source.name} failed: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error(`[AutoSync] ${errorMsg}`);
        
        await logVenueDrop('source_failed', { 
          source: sourceName, 
          error: errorMsg, 
          lat, 
          lng 
        });
      }
    }

    if (allVenues.length === 0) {
      throw new Error("No venues found from any source");
    }

    // Deduplicate venues
    const { venues: deduplicatedVenues, duplicates } = deduplicateVenues(allVenues);
    result.deduplicated = duplicates;
    result.total_venues = deduplicatedVenues.length;

    console.log(`[AutoSync] After deduplication: ${deduplicatedVenues.length} venues (${duplicates} duplicates removed)`);

    // Upsert venues to database
    const upsertResult = await withRetry(async () => {
      return await upsertVenues(deduplicatedVenues);
    }, { attempts: 3, backoffMs: 1000 });

    result.new_venues = upsertResult.inserted;
    result.updated_venues = upsertResult.updated;
    result.sources_used = sourcesUsed;
    result.ok = true;

    if (upsertResult.errors.length > 0) {
      result.errors.push(...upsertResult.errors);
    }

    console.log(`[AutoSync] Complete: ${result.new_venues} new, ${result.updated_venues} updated, ${result.deduplicated} deduplicated`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMsg);
    console.error("[AutoSync] Sync failed:", error);
    
    await logVenueDrop('sync_failed', { 
      error: errorMsg,
      lat: (await req.json().catch(() => ({})))?.lat,
      lng: (await req.json().catch(() => ({})))?.lng
    });
  }

  result.sync_time_ms = Date.now() - startTime;
  
  // Log the sync attempt
  try {
    const request = await req.json().catch(() => ({}));
    await logSyncAttempt(request.lat, request.lng, result);
  } catch (logError) {
    console.warn("[AutoSync] Failed to log sync attempt:", logError);
  }

  return respondWithCors(result, result.ok ? 200 : 500);
});