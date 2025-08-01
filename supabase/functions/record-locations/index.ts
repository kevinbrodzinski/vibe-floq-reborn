/**
 * Secure location recording edge function with authentication + CORS.
 * Accepts payload: { batch: [{ ts, lat, lng, acc? }] }
 * Inserts up to 50 rows into public.location_history
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleCors,
  validateAuth,
  createErrorResponse,
  checkRateLimit,
  validatePayload,
  corsHeaders,
  securityHeaders,
} from "../_shared/helpers.ts";

serve(async (req) => {
  /* 1️⃣  CORS pre-flight */
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    /* 2️⃣  Supabase client (service-role not required here) */
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!, // anon is fine; user JWT in header
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    /* 3️⃣  Auth */
    const { user } = await validateAuth(req, supabase);

    /* 4️⃣  Rate-limit */
    if (!checkRateLimit(user.id, 100, 1)) {
      return createErrorResponse("Rate limit exceeded", 429);
    }

    /* 5️⃣  Parse + validate JSON */
    const body = await req.json();
    const { batch } = validatePayload(body, ["batch"]);
    if (!Array.isArray(batch) || batch.length === 0) {
      return createErrorResponse("Batch must be a non-empty array");
    }
    if (batch.length > 50) {
      return createErrorResponse("Batch too large – max 50 locations");
    }

    /* 6️⃣  Sanitize each entry */
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAhead = now + 60 * 1000;

    const rows = batch.map((loc: any, i: number) => {
      if (
        typeof loc.lat !== "number" || typeof loc.lng !== "number" ||
        !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)
      ) throw new Error(`Invalid coords at index ${i}`);

      if (loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180) {
        throw new Error(`Coords out of bounds at index ${i}`);
      }

      const ts = new Date(loc.ts).getTime();
      if (Number.isNaN(ts)) throw new Error(`Bad timestamp at index ${i}`);
      if (ts < oneHourAgo || ts > oneMinuteAhead) {
        console.warn(`[record-locations] timestamp out of range idx=${i}`);
      }

      return {
        profile_id:  user.id,
        latitude:    loc.lat,
        longitude:   loc.lng,
        accuracy:    loc.acc ?? 0,
        recorded_at: new Date(loc.ts).toISOString(),
        created_at:  new Date().toISOString(),
      };
    });

    /* 7️⃣  Insert */
    const { error } = await supabase
      .from("location_history")
      .insert(rows, { returning: "minimal" });

    if (error) {
      console.error("[record-locations] DB error:", error);
      return createErrorResponse("Failed to record locations", 500);
    }

    /* 8️⃣  Success */
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, ...securityHeaders },
    });
  } catch (err) {
    console.error("[record-locations] error:", err);
    return createErrorResponse(
      err instanceof Error ? err.message : String(err),
      err?.status ?? 500,
    );
  }
});