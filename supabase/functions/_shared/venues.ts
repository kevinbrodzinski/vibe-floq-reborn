import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

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

export function mapToVenue(p: RawPlace) {
  const baseVenue = {
    source: "api" as const,
    radius_m: 100,
    popularity: 0,
    vibe_score: 50.0,
    live_count: 0,
  };

  if (p.provider === "google") {
    const r = p.r;
    return {
      ...baseVenue,
      provider: "google" as const,
      provider_id: r.place_id,
      name: r.name,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      address: r.vicinity ?? null,
      categories: (r.types ?? []).slice(0, 5),
      rating: r.rating ?? null,
      photo_url: r.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${r.photos[0].photo_reference}&key=${Deno.env.get("GOOGLE_PLACES_KEY")}`
        : null,
      price_tier: r.price_level ? "$".repeat(r.price_level) : "$",
    };
  }

  /* foursquare ------------------------------------------------------ */
  const r = (p as any).r;
  return {
    ...baseVenue,
    provider: "foursquare" as const,
    provider_id: r.fsq_id,
    name: r.name,
    lat: r.geocodes.main.latitude,
    lng: r.geocodes.main.longitude,
    address: r.location.formatted_address ?? null,
    categories: r.categories.map((c: any) => c.name).slice(0, 5),
    rating: r.rating ?? null,
    photo_url: r.photos?.[0]
      ? `${r.photos[0].prefix}original${r.photos[0].suffix}`
      : null,
    price_tier: r.price ?? "$",
  };
}

/* 3.  Bulk upsert helper ------------------------------------------- */
export async function upsertVenues(rows: ReturnType<typeof mapToVenue>[]) {
  if (!rows.length) return;
  const { error } = await sb.from("venues").upsert(rows, {
    onConflict: "provider,provider_id",
    ignoreDuplicates: false,
    returning: "minimal",
  });
  if (error) throw error;
}