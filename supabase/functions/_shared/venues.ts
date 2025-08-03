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
    const lat = r.geometry.location.lat;
    const lng = r.geometry.location.lng;
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
      geom: `SRID=4326;POINT(${lng} ${lat})`,
      geohash5: ngeohash.encode(lat, lng, 5),
    };
  }

  /* foursquare ------------------------------------------------------ */
  const r = (p as any).r;
  const lat = r.geocodes.main.latitude;
  const lng = r.geocodes.main.longitude;
  const categories = r.categories?.map((c: any) => c.name).slice(0, 5) ?? [];
  
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
    address: r.location.formatted_address ?? null,
    categories,
    rating: r.rating ?? null,
    photo_url: r.photos?.[0]
      ? `${r.photos[0].prefix}original${r.photos[0].suffix}`
      : null,
    price_tier: r.price ?? "$",
    vibe: vibeFrom(categories),
    geom: `SRID=4326;POINT(${lng} ${lat})`,
    geohash5: ngeohash.encode(lat, lng, 5),
  };
}

/* 3.  Bulk upsert helper ------------------------------------------- */
export async function upsertVenues(rows: ReturnType<typeof mapToVenue>[]) {
  if (!rows.length) return;
  const { error } = await sb.from("venues").upsert(rows, {
    onConflict: "source,external_id",
    ignoreDuplicates: false,
    returning: "minimal",
  });
  if (error) throw error;
}