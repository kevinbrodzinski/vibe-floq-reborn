import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
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
  // CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { floq_id, categories, max_km = 3, limit = 6, mode = "walk" } = await req.json();
    if (!floq_id) throw new Error("floq_id required");

    // 1) participants in floq
    const { data: parts, error: pErr } = await supabase
      .from("floq_participants")
      .select("profile_id")
      .eq("floq_id", floq_id);
    if (pErr) throw pErr;
    const memberIds = (parts ?? []).map((p) => p.profile_id);
    if (!memberIds.length) {
      return new Response(JSON.stringify({ members: [], candidates: [] }), {
        headers: corsHeaders,
      });
    }

    // 2) latest presence with a location point
    const { data: pres, error: vErr } = await supabase
      .from("vibes_now")
      .select("profile_id, location, updated_at")
      .in("profile_id", memberIds)
      .not("location", "is", null);
    if (vErr) throw vErr;

    const members = (pres ?? [])
      .map((r: any) => {
        // Support 'POINT(lng lat)' or GeoJSON-ish { coordinates:[lng,lat] }
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
      .filter(Boolean) as Point[] & { profile_id?: string }[];

    if (members.length < 2) {
      // Fallback with demo data for testing
      const demoMembers = [
        { profile_id: "demo-1", lat: 34.0009, lng: -118.4815 },
        { profile_id: "demo-2", lat: 34.0013, lng: -118.4772 },
        { profile_id: "demo-3", lat: 34.0002, lng: -118.4801 },
      ];
      const centroid = {
        lat: demoMembers.reduce((s, m) => s + m.lat, 0) / demoMembers.length,
        lng: demoMembers.reduce((s, m) => s + m.lng, 0) / demoMembers.length,
      };

      const candidates = [
        {
          id: "demo-venue-1",
          name: "Gran Blanco",
          lat: centroid.lat + 0.001,
          lng: centroid.lng + 0.001,
          meters_from_centroid: 150,
          avg_eta_min: 6,
          per_member: demoMembers.map(m => ({ profile_id: m.profile_id, meters: 200, eta_min: 6 })),
          score: 600
        },
        {
          id: "demo-venue-2", 
          name: "Café Nero",
          lat: centroid.lat - 0.0008,
          lng: centroid.lng + 0.0012,
          meters_from_centroid: 200,
          avg_eta_min: 8,
          per_member: demoMembers.map(m => ({ profile_id: m.profile_id, meters: 250, eta_min: 8 })),
          score: 750
        }
      ];

      return new Response(
        JSON.stringify({ 
          centroid,
          members: demoMembers, 
          candidates, 
          rationale: "Demo data - not enough live locations" 
        }),
        { headers: corsHeaders }
      );
    }

    // 3) centroid
    const centroid = {
      lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
      lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
    };

    // 4) pull venues near centroid (simplified venue data for now)
    const walkingMps = mode === "walk" ? 1.3 : 4.0; // ~4.7km/h vs ~14.4km/h cycling
    const maxMeters = Number(max_km) * 1000;

    // Mock venues for demo - in real implementation, query from venues table
    const mockVenues = [
      { id: "venue-1", name: "Gran Blanco", lat: centroid.lat + 0.001, lng: centroid.lng + 0.001, categories: ["bar", "social"] },
      { id: "venue-2", name: "Café Nero", lat: centroid.lat - 0.0008, lng: centroid.lng + 0.0012, categories: ["coffee", "quiet"] },
      { id: "venue-3", name: "Venice Beach", lat: centroid.lat + 0.002, lng: centroid.lng - 0.001, categories: ["outdoor", "active"] },
    ];

    const catSet =
      Array.isArray(categories) && categories.length
        ? new Set(categories.map((c: string) => c.toLowerCase()))
        : null;

    const candidates = mockVenues
      .filter((v: any) => {
        if (catSet && Array.isArray(v.categories)) {
          const ok = v.categories.some((c: string) => catSet.has(c.toLowerCase()));
          if (!ok) return false;
        }
        // discard far venues quickly
        return haversine(centroid, v) <= maxMeters;
      })
      .map((v: any) => {
        const perMember = members.map((m) => {
          const d = haversine({ lat: m.lat, lng: m.lng }, v); // meters
          const etaMin = Math.max(1, Math.round(d / walkingMps / 60));
          return { profile_id: m.profile_id, meters: d, eta_min: etaMin };
        });
        const total = perMember.reduce((s, a) => s + a.meters, 0);
        const avgEta = Math.round(
          perMember.reduce((s, a) => s + a.eta_min, 0) / perMember.length
        );
        return {
          id: v.id,
          name: v.name,
          lat: v.lat,
          lng: v.lng,
          per_member: perMember,
          meters_from_centroid: Math.round(haversine(centroid, v)),
          avg_eta_min: avgEta,
          score: total, // lower = better
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, Number(limit));

    const body = {
      centroid,
      members: members.map(({ profile_id, lat, lng }) => ({ profile_id, lat, lng })),
      candidates,
      rationale: "Ranked by summed member distance; walking ETA @1.3 m/s",
    };

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});