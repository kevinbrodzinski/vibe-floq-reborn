// Deno Edge: hq-proximity — returns centroid + member coarse points
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MemberPoint = { profile_id: string; lat: number; lng: number; status?: "free"|"soon"|"busy"|"ghost" };
type Proximity = { centroid: { lat: number; lng: number }; members: MemberPoint[]; convergence?: number };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { floq_id } = await req.json();
    if (!floq_id) throw new Error("floq_id required");

    // TODO: Replace this with real presence query (floq_sessions/floq_activity) respecting privacy bands.
    const centroid = { lat: 33.9925, lng: -118.4695 };
    const members: MemberPoint[] = [
      { profile_id: "p1", lat: 33.9935, lng: -118.4683, status: "free" },
      { profile_id: "p2", lat: 33.9913, lng: -118.4712, status: "soon" },
    ];
    const res: Proximity = { centroid, members, convergence: 0.82 };

    return new Response(JSON.stringify(res), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: corsHeaders });
  }
});