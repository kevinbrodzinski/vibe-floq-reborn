// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CanonicalPlace = {
  name: string;
  lat: number;
  lng: number;
  provider: "google" | "foursquare";
  provider_id: string;
  address?: string;
  categories?: string[];
  tags?: string[];
  cuisines?: string[];
  price_level?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  hours?: any; // jsonb-ready
  photo_url?: string | null;
  description?: string | null;
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // needs service role for writes + bypass RLS
);

const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const FSQ_KEY = Deno.env.get("FOURSQUARE_API_KEY");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const SLEEP_MS = 200; // tiny backoff between upstream calls
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY"); // optional embeddings
const SYNC_SECRET = Deno.env.get("SYNC_VENUES_SECRET"); // REQUIRED for access

/* -------------------- Helpers -------------------- */
const toRad = (d: number) => (d * Math.PI) / 180;
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const s = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function normalizeName(s: string) {
  return s.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|restaurant|bar|cafe|coffee|kitchen|grill|inc|llc)\b/g, "")
    .replace(/\s+/g, " ").trim();
}
function nameLikelySame(a: string, b: string) {
  const A = new Set(normalizeName(a).split(" "));
  const B = new Set(normalizeName(b).split(" "));
  if (!A.size || !B.size) return false;
  let overlap = 0; for (const w of A) if (B.has(w)) overlap++;
  const j = overlap / (A.size + B.size - overlap);
  return j >= 0.6;
}
function gridKey(lat: number, lng: number, meters = 60) {
  const latM = 111_320;
  const lngM = Math.cos((lat * Math.PI) / 180) * 111_320;
  const gy = Math.floor((lat * latM) / meters);
  const gx = Math.floor((lng * lngM) / meters);
  return `${gy}:${gx}`;
}
function mapTaxonomy(cats: string[] = []) {
  const tags = new Set<string>(), cuisines = new Set<string>();
  for (const c of cats.map((x) => x.toLowerCase())) {
    if (/pizza|italian/.test(c)) cuisines.add("italian");
    if (/sushi|japanese/.test(c)) cuisines.add("japanese");
    if (/mexican|taco|taquer/.test(c)) cuisines.add("mexican");
    if (/bar|cocktail|pub|speakeasy/.test(c)) tags.add("cocktail");
    if (/coffee|cafe|espresso/.test(c)) tags.add("coffee");
    if (/bakery|dessert|ice cream/.test(c)) tags.add("dessert");
    if (/vegan|vegetarian|plant/.test(c)) tags.add("vegan");
    if (/outdoor|patio|terrace/.test(c)) tags.add("outdoor");
    if (/night|club|dance|dj|live music/.test(c)) tags.add("late-night");
  }
  return { tags: [...tags], cuisines: [...cuisines] };
}

/* -------------------- Providers -------------------- */
async function fetchGooglePlaces(lat: number, lng: number, radius: number, limit: number): Promise<CanonicalPlace[]> {
  if (!GOOGLE_KEY) return [];
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const body = {
    locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    maxResultCount: Math.min(limit, 50),
    includedTypes: ["restaurant","bar","cafe"],
    languageCode: "en",
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types,places.currentOpeningHours,places.photos",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const places = Array.isArray(json.places) ? json.places : [];
  return places.map((p: any) => {
    const cats = (p.types ?? []).map((t: string) => t.replace(/_/g, " "));
    const { tags, cuisines } = mapTaxonomy(cats);
    const photoRef = p.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=640&key=${GOOGLE_KEY}`
      : null;
    return {
      name: p.displayName?.text ?? "Unknown",
      lat: p.location?.latitude, lng: p.location?.longitude,
      provider: "google" as const,
      provider_id: p.id,
      address: p.formattedAddress,
      categories: cats, tags, cuisines,
      price_level: typeof p.priceLevel === "number" ? p.priceLevel : null,
      rating: typeof p.rating === "number" ? p.rating : null,
      rating_count: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      hours: p.currentOpeningHours ?? null,
      photo_url: photoRef, description: null,
    };
  }).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
}

async function fetchFoursquare(lat: number, lng: number, radius: number, limit: number): Promise<CanonicalPlace[]> {
  if (!FSQ_KEY) return [];
  const params = new URLSearchParams({
    ll: `${lat},${lng}`, radius: String(radius),
    categories: "13000,13065,13032,13035,13040",
    limit: String(Math.min(limit, 50)), sort: "DISTANCE",
  });
  const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
    headers: { Authorization: FSQ_KEY! },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const items = Array.isArray(json.results) ? json.results : [];
  return items.map((p: any) => {
    const cats = (p.categories ?? []).map((c: any) => c.name);
    const { tags, cuisines } = mapTaxonomy(cats);
    return {
      name: p.name ?? "Unknown",
      lat: p.geocodes?.main?.latitude, lng: p.geocodes?.main?.longitude,
      provider: "foursquare" as const,
      provider_id: p.fsq_id,
      address: p.location?.formatted_address,
      categories: cats, tags, cuisines,
      price_level: null, rating: null, rating_count: null,
      hours: p.hours?.display ? p.hours : null,
      photo_url: null, description: null,
    };
  }).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
}

/* -------------------- DB helpers -------------------- */
async function findAlias(provider: string, provider_id: string) {
  const { data, error } = await supabaseAdmin
    .from("venue_aliases")
    .select("venue_id")
    .eq("provider", provider)
    .eq("provider_id", provider_id)
    .maybeSingle();
  if (error) throw error;
  return data?.venue_id as string | undefined;
}

async function findDuplicateViaDB(name: string, lat: number, lng: number, address?: string,
  radius_m = 80, name_sim = 0.64, addr_sim = 0.58) {
  const { data, error } = await supabaseAdmin.rpc("find_duplicate_venue", {
    p_name: name, p_lat: lat, p_lng: lng, p_address: address ?? null,
    p_radius_m: radius_m, p_name_sim: name_sim, p_addr_sim: addr_sim,
  });
  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function upsertMergeVenue(p: CanonicalPlace) {
  const payload = {
    name: p.name, lat: p.lat, lng: p.lng, provider: p.provider, provider_id: p.provider_id,
    address: p.address ?? null, categories: p.categories ?? [], tags: p.tags ?? [], cuisines: p.cuisines ?? [],
    price_level: p.price_level ?? null, rating: p.rating ?? null, rating_count: p.rating_count ?? null,
    hours: p.hours ?? null, photo_url: p.photo_url ?? null, description: p.description ?? null,
  };
  const { data, error } = await supabaseAdmin.rpc("upsert_merge_venue", { p: payload as any });
  if (error) throw error;
  return data as string;
}

function embeddingText(p: CanonicalPlace) {
  return [p.name, (p.categories ?? []).join(", "), (p.tags ?? []).join(", "),
          (p.cuisines ?? []).join(", "), p.address ?? "", p.description ?? ""]
          .filter(Boolean).join(" • ");
}
async function maybeSetEmbedding(venueId: string, place: CanonicalPlace) {
  if (!OPENAI_API_KEY) return;
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: embeddingText(place) })
  });
  if (!resp.ok) return;
  const json = await resp.json();
  const vec = json.data?.[0]?.embedding;
  if (!Array.isArray(vec) || !vec.length) return;
  await supabaseAdmin.rpc("set_venue_embedding", { p_venue_id: venueId, p_emb: vec });
}

/* -------------------- Handler -------------------- */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Secret gate
    if (!SYNC_SECRET || req.headers.get("x-sync-secret") !== SYNC_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {
      lat, lng, radius_m = 3000, limit = 50,
      providers = { google: true, foursquare: true },
      dry_run = false,
      log_decisions = true,
      density = "default" // 'urban' | 'suburban' | 'default'
    } = await req.json();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ ok: false, error: "lat/lng required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Density-based thresholds
    const params = {
      dedupe_radius_m: density === "urban" ? 60 : density === "suburban" ? 90 : 80,
      name_sim: density === "urban" ? 0.68 : 0.64,
      addr_sim: density === "urban" ? 0.62 : 0.58,
    };

    // Create run
    const caller = `${req.headers.get("x-forwarded-for") ?? ""} | ${req.headers.get("user-agent") ?? ""}`;
    const { data: runRow, error: runErr } = await supabaseAdmin
      .from("venue_import_runs")
      .insert({
        params: { lat, lng, radius_m, limit, providers, dry_run, density, thresholds: params },
        caller,
        status: "started"
      })
      .select("*")
      .single();
    if (runErr) throw runErr;
    const run_id = runRow.id as string;

    // Fetch
    const [g, f] = await Promise.all([
      providers.google ? fetchGooglePlaces(lat, lng, radius_m, limit) : Promise.resolve([]),
      providers.foursquare ? fetchFoursquare(lat, lng, radius_m, limit) : Promise.resolve([]),
    ]);

    // Lightweight local clustering to reduce dup calls
    const buckets = new Map<string, CanonicalPlace[]>();
    for (const p of [...g, ...f]) {
      const k = gridKey(p.lat, p.lng, 60);
      const arr = buckets.get(k) ?? [];
      arr.push(p);
      buckets.set(k, arr);
    }
    const merged: CanonicalPlace[] = [];
    for (const [, arr] of buckets) {
      const used = new Set<number>();
      for (let i = 0; i < arr.length; i++) {
        if (used.has(i)) continue;
        const group = [arr[i]];
        used.add(i);
        for (let j = i + 1; j < arr.length; j++) {
          if (used.has(j)) continue;
          if (nameLikelySame(arr[i].name, arr[j].name) &&
              haversineMeters(arr[i], arr[j]) <= 60) {
            group.push(arr[j]); used.add(j);
          }
        }
        // choose the richest representative to send to DB
        const best = group.sort((x, y) => (y.rating_count ?? -1) - (x.rating_count ?? -1))[0];
        merged.push(best);
      }
    }

    // For each place: alias check → DB fuzzy check → (insert/merge or dry)
    let upserted = 0;
    const results: any[] = [];
    for (const m of merged) {
      // 1) exact alias
      const aliasId = await findAlias(m.provider, m.provider_id);

      if (aliasId) {
        if (log_decisions) {
          await supabaseAdmin.from("dedupe_decisions").insert({
            run_id, place_name: m.name, provider: m.provider, provider_id: m.provider_id,
            lat: m.lat, lng: m.lng, address: m.address ?? null,
            decision: "alias", matched_venue_id: aliasId,
            radius_m: params.dedupe_radius_m, thresholds: { name_sim: params.name_sim, addr_sim: params.addr_sim },
            notes: {}
          });
        }
        if (!dry_run) {
          // still merge to fill missing fields
          await upsertMergeVenue(m);
          await maybeSetEmbedding(aliasId, m);
          upserted++;
        }
        results.push({ name: m.name, decision: "alias", venue_id: aliasId, provider: m.provider, provider_id: m.provider_id });
        continue;
      }

      // 2) DB fuzzy duplicate (geo + trigram)
      const dup = await findDuplicateViaDB(m.name, m.lat, m.lng, m.address, params.dedupe_radius_m, params.name_sim, params.addr_sim);

      if (dup?.venue_id) {
        if (log_decisions) {
          await supabaseAdmin.from("dedupe_decisions").insert({
            run_id, place_name: m.name, provider: m.provider, provider_id: m.provider_id,
            lat: m.lat, lng: m.lng, address: m.address ?? null,
            decision: "match", matched_venue_id: dup.venue_id,
            dist_m: dup.dist_m, name_sim: dup.name_sim, addr_sim: dup.addr_sim,
            radius_m: params.dedupe_radius_m, thresholds: { name_sim: params.name_sim, addr_sim: params.addr_sim },
            notes: {}
          });
        }
        if (!dry_run) {
          await upsertMergeVenue(m);
          await maybeSetEmbedding(dup.venue_id, m);
          upserted++;
        }
        results.push({ name: m.name, decision: "match", venue_id: dup.venue_id, provider: m.provider, provider_id: m.provider_id });
        continue;
      }

      // 3) Insert new
      if (log_decisions) {
        await supabaseAdmin.from("dedupe_decisions").insert({
          run_id, place_name: m.name, provider: m.provider, provider_id: m.provider_id,
          lat: m.lat, lng: m.lng, address: m.address ?? null,
          decision: dry_run ? "skip" : "insert",
          matched_venue_id: null,
          radius_m: params.dedupe_radius_m, thresholds: { name_sim: params.name_sim, addr_sim: params.addr_sim },
          notes: {}
        });
      }
      if (!dry_run) {
        const id = await upsertMergeVenue(m);
        await maybeSetEmbedding(id, m);
        upserted++;
        results.push({ name: m.name, decision: "insert", venue_id: id, provider: m.provider, provider_id: m.provider_id });
      } else {
        results.push({ name: m.name, decision: "skip", provider: m.provider, provider_id: m.provider_id });
      }
      
      // Gentle backoff between upstream calls
      await sleep(SLEEP_MS);
    }

    // mark run done
    await supabaseAdmin.from("venue_import_runs")
      .update({ status: "done" })
      .eq("id", run_id);

    return new Response(JSON.stringify({
      ok: true,
      run_id,
      counts: { google: g.length, foursquare: f.length, merged: merged.length, upserted, dry_run },
      results
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error(e);
    // best effort: mark latest run as error if we created one
    try {
      const { data } = await supabaseAdmin
        .from("venue_import_runs").select("id").order("started_at", { ascending: false }).limit(1).single();
      if (data?.id) await supabaseAdmin.from("venue_import_runs").update({ status: "error" }).eq("id", data.id);
    } catch {}
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});