import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import ngeohash from "https://esm.sh/ngeohash@0.6.3";

/* 1.  Shared service-role client  ---------------------------------- */
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/* 2.  Provider-agnostic mapper  ------------------------------------ */
type RawPlace =
  | { provider: "google"; r: any }
  | { provider: "foursquare"; r: any };

// Helper function to generate URL-safe slug from venue name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
}

// Classify vibe based on categories
function vibeFrom(categories: string[]): string {
  const catStr = categories.join(' ').toLowerCase();
  
  if (catStr.includes('bar') || catStr.includes('club') || catStr.includes('night')) return 'energetic';
  if (catStr.includes('restaurant') || catStr.includes('food')) return 'social';
  if (catStr.includes('coffee') || catStr.includes('cafe')) return 'chill';
  if (catStr.includes('library') || catStr.includes('study')) return 'focused';
  if (catStr.includes('gym') || catStr.includes('fitness')) return 'energetic';
  
  return 'mixed';
}

export function mapToVenue(p: RawPlace) {
  const baseVenue = {
    radius_m: 100,
    popularity: 0,
    vibe_score: 50.0,
    live_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (p.provider === "google") {
    const r = p.r;
    const lat = Number(r.geometry?.location?.lat);
    const lng = Number(r.geometry?.location?.lng);
    
    // Validate coordinates instead of silent fallback
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`[mapToVenue] Invalid Google coordinates for ${r.place_id}: lat=${lat}, lng=${lng}`);
      return null;
    }
    
    const categories = (r.types ?? []).slice(0, 5);
    
    return {
      ...baseVenue,
      source: "google",
      external_id: r.place_id,
      provider: "google", // legacy compatibility
      provider_id: r.place_id, // legacy compatibility
      name: r.name,
      slug: generateSlug(r.name),
      lat,
      lng,
      address: r.vicinity ?? null,
      categories,
      rating: r.rating ?? null,
      photo_url: r.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${r.photos[0].photo_reference}&key=${Deno.env.get("GOOGLE_PLACES_KEY")}`
        : null,
      price_tier: r.price_level ? "$".repeat(r.price_level) : "$",
      vibe: vibeFrom(categories),
      geohash5: ngeohash.encode(lat, lng, 5),
      description: null,
      profile_id: null,
    };
  }

  /* foursquare ------------------------------------------------------ */
  const r = (p as any).r;
  
  const lat = Number(r?.geocodes?.main?.latitude);
  const lng = Number(r?.geocodes?.main?.longitude);
  
  // Validate coordinates instead of silent fallback
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn(`[mapToVenue] Invalid Foursquare coordinates for ${r?.fsq_id}: lat=${lat}, lng=${lng}`);
    return null;
  }
  
  const categories = r.categories?.map((c: any) => c.name).slice(0, 5) ?? [];
  
  // Guard brittle photo reference extraction
  const photoUrl = r.photos?.[0]?.prefix && r.photos?.[0]?.suffix 
    ? `${r.photos[0].prefix}original${r.photos[0].suffix}`
    : null;
  
  return {
    ...baseVenue,
    source: "foursquare",
    external_id: r.fsq_id,
    provider: "foursquare", // legacy compatibility
    provider_id: r.fsq_id, // legacy compatibility
    name: r.name,
    slug: generateSlug(r.name),
    lat,
    lng,
    address: r.location?.formatted_address ?? null,
    categories,
    rating: r.rating ?? null,
    photo_url: photoUrl,
    price_tier: r.price ?? "$",
    vibe: vibeFrom(categories),
    geohash5: ngeohash.encode(lat, lng, 5),
    description: null,
    profile_id: null,
  };
}

/**
 * Log venue sync errors to the database for observability
 */
export async function logVenueDrop(reason: string, payload: any, source?: string, external_id?: string, lat?: number, lng?: number) {
  try {
    // Truncate huge payload before logging
    const trimmed = JSON.stringify(payload).slice(0, 8000);
    const truncatedPayload = { 
      ...payload, 
      snippet: trimmed,
      original_size: JSON.stringify(payload).length 
    };
    
    const { error } = await sb
      .from('venues_sync_errors')
      .insert({
        reason,
        payload: truncatedPayload,
        source: source || 'unknown',
        external_id,
        lat,
        lng
      });
    
    if (error) {
      console.error('[logVenueDrop] Failed to log error:', error);
    }
  } catch (err) {
    console.error('[logVenueDrop] Exception while logging:', err);
  }
}

/* 3.  Bulk upsert helper ------------------------------------------- */
type VenueRow = ReturnType<typeof mapToVenue>;

export async function upsertVenues(rows: (VenueRow | null)[]): Promise<{ inserted: number; updated: number; errors: any[] }> {
  if (!rows.length) return { inserted: 0, updated: 0, errors: [] };
  
  const errors: any[] = [];
  
  // Filter out null rows (venues with missing coordinates)
  const validRows = rows.filter(Boolean) as VenueRow[];
  
  // Batch log venue drops if any
  if (rows.length !== validRows.length) {
    const dropCount = rows.length - validRows.length;
    console.warn(`[VenueUpsert] Dropped ${dropCount} venues with missing coordinates`);
    await logVenueDrop('missing_coordinates', { dropCount, totalRows: rows.length });
  }
  
  // Filter out rows without required source/external_id
  const finalRows = validRows.filter(row => row.source && row.external_id);
  
  if (validRows.length !== finalRows.length) {
    const dropCount = validRows.length - finalRows.length;
    console.warn(`[VenueUpsert] Dropped ${dropCount} venues with missing source/external_id`);
    await logVenueDrop('missing_identifiers', { dropCount, validRows: validRows.length });
  }
  
  if (finalRows.length === 0) {
    return { inserted: 0, updated: 0, errors: ['No valid venues to upsert'] };
  }
  
  try {
    // Get real inserted/updated counts using returning representation
    const { data, error } = await sb.from("venues").upsert(finalRows, {
      onConflict: "source,external_id",
      ignoreDuplicates: false,
      returning: "representation",
    });
    
    if (error) {
      await logVenueDrop('upsert_error', { error: error.message, venueCount: finalRows.length });
      throw error;
    }
    
    // Calculate real counts based on xmax field (0 = new insert, >0 = update)
    const inserted = data?.filter(r => (r as any).xmax === '0').length || 0;
    const updated = (data?.length || 0) - inserted;
    
    return { inserted, updated, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    await logVenueDrop('unexpected_error', { error: error instanceof Error ? error.message : String(error), venueCount: finalRows.length });
    return { inserted: 0, updated: 0, errors };
  }
}