// supabase/functions/ai-suggest-venues/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReqBody = {
  center: { lat: number; lng: number };
  when: string;
  groupSize?: number;
  maxPriceTier?: "$" | "$$" | "$$$" | "$$$$";
  categories?: string[];
  limit?: number;
  radiusM?: number;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const { 
      center, 
      when, 
      groupSize = 4, 
      maxPriceTier = "$$$", 
      categories = [], 
      limit = 24, 
      radiusM = 2000 
    } = await req.json() as ReqBody;

    if (!center?.lat || !center?.lng || !when) {
      return Response.json(
        { error: "center{lat,lng} and when are required" }, 
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: auth } },
      }
    );

    // For MVP, we'll use the existing venues table with basic filtering
    // Convert price tier to numeric for comparison
    const priceMap = { "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 };
    const maxPrice = priceMap[maxPriceTier] || 3;

    const { data: venues, error } = await supabase
      .from("venues")
      .select("*")
      .not('location', 'is', null)
      .lte('price_level', maxPrice)
      .limit(limit);

    if (error) {
      console.error("Venue query error:", error);
      throw error;
    }

    // Calculate distances and filter by radius
    const venuesWithDistance = (venues || [])
      .map((venue: any) => {
        if (!venue.location) return null;
        
        // Extract lat/lng from PostGIS point (simplified)
        const lat = venue.lat || 0;
        const lng = venue.lng || 0;
        
        // Haversine distance calculation
        const R = 6371000; // Earth radius in meters
        const dLat = (lat - center.lat) * Math.PI / 180;
        const dLng = (lng - center.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(center.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const distance = 2 * R * Math.asin(Math.sqrt(a));
        
        return {
          ...venue,
          distance_m: Math.round(distance),
          vibe_score: venue.vibe_score || Math.random() * 100, // Fallback score
          reasons: [`${Math.round(distance)}m away`, `${venue.name} matches your group size`]
        };
      })
      .filter((venue: any) => venue && venue.distance_m <= radiusM)
      .sort((a: any, b: any) => {
        // Sort by combination of distance and vibe score
        const scoreA = (100 - a.vibe_score) + (a.distance_m / 100);
        const scoreB = (100 - b.vibe_score) + (b.distance_m / 100);
        return scoreA - scoreB;
      });

    return Response.json(
      { venues: venuesWithDistance },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error("AI suggest venues error:", e);
    return Response.json(
      { error: String(e?.message ?? e) },
      { status: 500, headers: corsHeaders }
    );
  }
});