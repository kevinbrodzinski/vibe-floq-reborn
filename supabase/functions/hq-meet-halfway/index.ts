import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { corsHeaders } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type Point = { lat: number; lng: number };
const R = 6371000; // meters
const toRad = (d: number) => (d * Math.PI) / 180;
const haversine = (a: Point, b: Point) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la = toRad(a.lat);
  const lb = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)); // meters
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      floq_id,
      categories = [],
      max_km = 3,
      limit = 6,
      mode = "walk", // walk|bike
    } = await req.json();

    if (!floq_id) throw new Error("floq_id required");

    // 1) Floq member ids
    const { data: parts, error: partsErr } = await admin
      .from("floq_participants")
      .select("profile_id")
      .eq("floq_id", floq_id);
    if (partsErr) throw partsErr;
    const memberIds = (parts ?? []).map((p) => p.profile_id);
    if (!memberIds.length) {
      return new Response(JSON.stringify({ centroid: null, members: [], candidates: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Live presence with locations
    const { data: pres, error: presErr } = await admin
      .from("vibes_now")
      .select("profile_id, location")
      .in("profile_id", memberIds)
      .not("location", "is", null);
    if (presErr) throw presErr;

    const members: Array<{ profile_id: string } & Point> = (pres ?? [])
      .map((r: any) => {
        let lat: number | null = null,
          lng: number | null = null;
        if (typeof r.location === "string") {
          const m = r.location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
          if (m) {
            lng = parseFloat(m[1]);
            lat = parseFloat(m[2]);
          }
        } else if (r.location?.coordinates?.length === 2) {
          lng = r.location.coordinates[0];
          lat = r.location.coordinates[1];
        }
        return lat != null && lng != null
          ? { profile_id: r.profile_id, lat, lng }
          : null;
      })
      .filter(Boolean) as any[];

    // not enough live locations → graceful demo
    if (members.length < 2) {
      const demo = [
        { profile_id: "demo-1", lat: 34.0009, lng: -118.4815 },
        { profile_id: "demo-2", lat: 34.0013, lng: -118.4772 },
        { profile_id: "demo-3", lat: 34.0002, lng: -118.4801 },
      ];
      const centroid = {
        lat: demo.reduce((s, m) => s + m.lat, 0) / demo.length,
        lng: demo.reduce((s, m) => s + m.lng, 0) / demo.length,
      };
      const candidates = [
        {
          id: "demo-venue-1",
          name: "Gran Blanco",
          lat: centroid.lat + 0.001,
          lng: centroid.lng + 0.001,
          meters_from_centroid: 150,
          avg_eta_min: 6,
          per_member: demo.map((m) => ({
            profile_id: m.profile_id,
            meters: 200,
            eta_min: 6,
          })),
          score: 600,
        },
        {
          id: "demo-venue-2",
          name: "Café Nero",
          lat: centroid.lat - 0.0008,
          lng: centroid.lng + 0.0012,
          meters_from_centroid: 200,
          avg_eta_min: 8,
          per_member: demo.map((m) => ({
            profile_id: m.profile_id,
            meters: 250,
            eta_min: 8,
          })),
          score: 750,
        },
      ];
      return new Response(
        JSON.stringify({
          centroid,
          members: demo,
          candidates,
          rationale: "Demo: not enough live locations",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) centroid
    const centroid = {
      lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
      lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
    };

    const walkingMps = mode === "walk" ? 1.3 : 4.0; // ~4.7km/h vs 14.4km/h
    const maxMeters = Number(max_km) * 1000;
    const cats = Array.isArray(categories) ? categories.map((c: string) => c.toLowerCase()) : [];

    // 4) query venues - fallback to lat/lng columns
    const { data: vdata, error: verr } = await admin
      .from("venues")
      .select("id,name,lat,lng,categories")
      .limit(2000);
    if (verr) throw verr;
    const venues = (vdata ?? []) as Array<{ id: string; name: string; lat: number; lng: number; categories?: string[] }>;

    // Filter + score
    const catSet = cats.length ? new Set(cats) : null;
    const candidates = venues
      .filter((v) => {
        if (catSet && Array.isArray(v.categories)) {
          const ok = (v.categories as string[]).some((c) => catSet.has(c.toLowerCase()));
          if (!ok) return false;
        }
        return haversine(centroid, v) <= maxMeters;
      })
      .map((v) => {
        const perMember = members.map((m) => {
          const d = haversine({ lat: m.lat, lng: m.lng }, v);
          const eta = Math.max(1, Math.round(d / walkingMps / 60));
          return { profile_id: m.profile_id, meters: Math.round(d), eta_min: eta };
        });
        const total = perMember.reduce((s, a) => s + a.meters, 0);
        const avgEta = Math.round(perMember.reduce((s, a) => s + a.eta_min, 0) / perMember.length);
        return {
          id: v.id,
          name: v.name,
          lat: v.lat,
          lng: v.lng,
          per_member: perMember,
          meters_from_centroid: Math.round(haversine(centroid, v)),
          avg_eta_min: avgEta,
          score: total,
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, Number(limit));

    return new Response(
      JSON.stringify({
        centroid,
        members: members.map(({ profile_id, lat, lng }) => ({ profile_id, lat, lng })),
        candidates,
        rationale: "Ranked by summed member distance; walking ETA @1.3m/s",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});