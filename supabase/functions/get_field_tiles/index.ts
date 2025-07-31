// deno ≥1.41  • Edge Function  • returns crowd stats for a list of tile_ids
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

/* ------------------------------------------------------------------ */
/*  CORS helper – no external import, echoes caller’s Origin           */
/* ------------------------------------------------------------------ */
function cors(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  } as const;
}

/* ------------------------------------------------------------------ */
/*  config                                                             */
/* ------------------------------------------------------------------ */
const TTL_SECONDS = 30;              // align with React-Query staleTime
const SB_URL      = Deno.env.get("SUPABASE_URL")!;
const SR_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service-role

/* ------------------------------------------------------------------ */
/*  handler                                                            */
/* ------------------------------------------------------------------ */
serve(async (req) => {
  const headers = cors(req.headers.get("Origin") ?? "*");

  /* CORS pre-flight */
  if (req.method === "OPTIONS") return new Response(null, { headers });

  /* only POST */
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }),
      { status: 405, headers });
  }

  try {
    /* ---------- input ------------------------------------------------ */
    const { tile_ids = [], since } = await req.json().catch(() => ({}));
    if (!Array.isArray(tile_ids) || tile_ids.length === 0) {
      return new Response(JSON.stringify({ error: "tile_ids[] required" }),
        { status: 400, headers });
    }

    /* ---------- edge-KV micro-cache (CF Workers / Supabase platform) -- */
    const cacheKey = `field_tiles:${tile_ids.sort().join(",")}:${since ?? "0"}`;
    const hasKV    = typeof caches !== "undefined" && caches.default;
    if (hasKV) {
      const hit = await caches.default.match(cacheKey);
      if (hit) return new Response(hit.body, { headers: { ...headers, "x-cache": "hit" } });
    }

    /* ---------- Supabase query --------------------------------------- */
    const sb     = createClient(SB_URL, SR_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from("field_tiles")
      .select("tile_id,crowd_count,avg_vibe,updated_at")
      .in("tile_id", tile_ids)
      .gt("updated_at", since ?? "epoch");

    if (error) {
      console.error("[get_field_tiles] DB error", error);
      return new Response(JSON.stringify({ tiles: [] }), { status: 200, headers });
    }

    const body = JSON.stringify({ tiles: data ?? [] });
    const resp = new Response(body, { status: 200, headers });

    /* ---------- write micro-cache ------------------------------------ */
    if (hasKV) {
      caches.default.put(cacheKey, resp.clone(), { expirationTtl: TTL_SECONDS }).catch((e) =>
        console.warn("[get_field_tiles] cache put failed", e.message)
      );
    }

    return resp;

  } catch (e) {
    console.error("[get_field_tiles] fatal", e);
    return new Response(JSON.stringify({ error: "internal" }),
      { status: 500, headers });
  }
});