// Deno Edge — hq-meet-halfway
// Contract: { floq_id, categories[], max_km, limit, mode }
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type HalfCandidate = {
  id: string; 
  name: string; 
  lat: number; 
  lng: number;
  meters_from_centroid: number; 
  avg_eta_min: number;
  per_member: Array<{ profile_id: string; meters: number; eta_min: number }>;
  score: number;
  category?: "coffee" | "bar" | "food" | "park" | "other";
};

type HalfResult = {
  centroid: { lat: number; lng: number };
  candidates: HalfCandidate[];
  stats: { sample: number; avg_pair_distance_m: number };
  policy?: { privacy: "banded"; min_members: number };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { floq_id, categories = [], max_km = 3, limit = 6, mode = "walk" } = await req.json();

    // TODO (phase-2): query live member coarse locations + ETA matrix.
    // For now, return a deterministic stub so UI is fully wired.
    // Venice centroid-ish for demo:
    const centroid = { lat: 33.9925, lng: -118.4695 };

    // Simple demo candidates (category-colored on client):
    const base: HalfCandidate[] = [
      { 
        id: "cafe_nero", 
        name: "Café Nero", 
        lat: 33.9929, 
        lng: -118.4681, 
        meters_from_centroid: 160, 
        avg_eta_min: 6, 
        per_member: [], 
        score: 0.92,
        category: "coffee"
      },
      { 
        id: "coffee_district", 
        name: "Coffee District", 
        lat: 33.9918, 
        lng: -118.4707, 
        meters_from_centroid: 210, 
        avg_eta_min: 7, 
        per_member: [], 
        score: 0.89,
        category: "coffee"
      },
      { 
        id: "gran_blanco", 
        name: "Gran Blanco", 
        lat: 33.9874, 
        lng: -118.4690, 
        meters_from_centroid: 590, 
        avg_eta_min: 12, 
        per_member: [], 
        score: 0.83,
        category: "bar"
      },
      { 
        id: "venice_kitchen", 
        name: "Venice Kitchen", 
        lat: 33.9910, 
        lng: -118.4720, 
        meters_from_centroid: 320, 
        avg_eta_min: 9, 
        per_member: [], 
        score: 0.87,
        category: "food"
      },
    ];

    // Filter by categories if provided
    const filtered = categories.length > 0
      ? base.filter(candidate => categories.includes(candidate.category))
      : base;

    const res: HalfResult = {
      centroid,
      candidates: filtered.slice(0, limit),
      stats: { sample: 4, avg_pair_distance_m: 820 },
      policy: { privacy: "banded", min_members: 3 }
    };

    return new Response(JSON.stringify(res), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});