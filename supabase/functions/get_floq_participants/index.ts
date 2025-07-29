/// <reference lib="dom" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ────────────────────────────────────────────────────────────
// CORS helpers
// ────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin":
    "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
} as const;

// ────────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────────
serve(async (req) => {
  // 1. Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 2. Parse body (guard against empty / malformed JSON)
    const { floq_id, limit = 6 } = await req
      .json()
      .catch(() => ({} as Record<string, unknown>));

    if (!floq_id || typeof floq_id !== "string") {
      return response(400, { error: "`floq_id` is required (string)" });
    }

    const safeLimit = clamp(Number(limit) || 6, 1, 12);

    // 3. Supabase client (reuse caller’s JWT so RLS still applies)
    const supabase = createClient(
      // These env vars are **injected automatically** by Supabase
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") ?? "",
          },
        },
      },
    );

    // 4. Fetch participants + avatar using separate queries to avoid relationship ambiguity
    const { data: participants, error: participantsError } = await supabase
      .from("floq_participants")
      .select("profile_id")
      .eq("floq_id", floq_id)
      .limit(safeLimit);

    if (participantsError) {
      console.error("[get_floq_participants] Participants query error:", participantsError);
      return response(400, { error: participantsError.message });
    }

    if (!participants || participants.length === 0) {
      return response(200, []);
    }

    // Get profile IDs
    const profileIds = participants.map(p => p.profile_id);

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", profileIds);

    if (profilesError) {
      console.error("[get_floq_participants] Profiles query error:", profilesError);
      return response(400, { error: profilesError.message });
    }

    // Create a map of profile_id to avatar_url
    const avatarMap = new Map();
    profiles?.forEach(profile => {
      avatarMap.set(profile.id, profile.avatar_url);
    });

    // Combine the data
    const data = participants.map(participant => ({
      profile_id: participant.profile_id,
      avatar_url: avatarMap.get(participant.profile_id) || null,
    }));

    return response(200, data);
  } catch (err) {
    console.error("[get_floq_participants] Unhandled:", err);
    return response(500, { error: "Internal server error" });
  }
});

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}