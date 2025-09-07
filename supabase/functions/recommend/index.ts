// supabase/functions/recommend/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handlePreflight } from "../_shared/cors.ts";

type UUID = string;

const DO_RERANK = (Deno.env.get("LLM_RERANK") || "").toLowerCase() === "true";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  
  if (req.method !== "POST") {
    const headers = corsHeadersFor(req);
    return new Response("Method Not Allowed", { 
      status: 405, 
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }

  try {
    // Move env reads/client creation *after* preflight
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const raw = await req.json();

    // Accept both camelCase and snake_case from clients
    const body = {
      profileId: raw.profileId ?? raw.profile_id ?? null,
      lat: raw.lat,
      lng: raw.lng,
      radiusM: raw.radiusM ?? raw.radius_m ?? 3000,
      limit: raw.limit ?? 20,
      vibe: raw.vibe ?? null,
      tags: raw.tags ?? null,
      tz: raw.tz ?? "America/Los_Angeles",
      useLLM: raw.useLLM ?? raw.use_llm ?? false,
      llmTopK: raw.llmTopK ?? raw.llm_top_k ?? 30,
      ab: raw.ab ?? (DO_RERANK ? "edge+llm" : "edge"),
    };

    // Call your verbose RPC (already VOLATILE + returns badges/reason/components/weights)
    const { data, error } = await supabaseAdmin.rpc("get_personalized_recs_verbose", {
      p_profile_id: body.profileId,
      p_lat: body.lat,
      p_lng: body.lng,
      p_radius_m: body.radiusM,
      p_now: new Date().toISOString(),
      p_vibe: body.vibe,
      p_tags: body.tags,
      p_tz: body.tz,
      p_limit: body.limit,
      p_ab: body.ab,
      p_log: true,
    });
    
    if (error) {
      const headers = corsHeadersFor(req);
      return new Response(JSON.stringify({ error }), { 
        status: 500, 
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const recs = data ?? [];
    const headers = corsHeadersFor(req);
    if (recs.length === 0) return new Response(JSON.stringify({ items: [] }), { 
      status: 200, 
      headers: { ...headers, "Content-Type": "application/json" } 
    });

    // --- Pull extra signals for explanations ---------------------------------
    const venueIds: UUID[] = recs.map((r: any) => r.venue_id);

    // 1) Live load + hourly popularity baseline
    const { data: venueRows } = await supabaseAdmin
      .from("venues")
      .select("id, live_count, popularity_hourly")
      .in("id", venueIds);

    const venueById = Object.fromEntries((venueRows ?? []).map(v => [v.id, v]));

    // 2) Friend set (service role; adjust table/columns if yours differ)
    async function getFriendIds(uid: UUID): Promise<UUID[]> {
      // Try friendships(a_id,b_id,status='accepted'); fallbacks try other common shapes
      const { data: rows1 } = await supabaseAdmin
        .from("friendships")
        .select("a:profile_id_a,b:profile_id_b,status")
        .or(`profile_id_a.eq.${uid},profile_id_b.eq.${uid}`)
        .eq("status", "accepted");
      if (rows1 && rows1.length) {
        return rows1.map((r: any) => (r.a === uid ? r.b : r.a));
      }
      // Fallback: friends(profile_id, friend_id, state)
      const { data: rows2 } = await supabaseAdmin
        .from("friends")
        .select("friend_id, state")
        .eq("profile_id", uid)
        .eq("state", "accepted");
      if (rows2 && rows2.length) return rows2.map((r: any) => r.friend_id);
      return [];
    }
    const friendIds = body.profileId ? await getFriendIds(body.profileId) : [];

    // 3) Friend visits & likes in last 60d
    const sinceISO = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data: friendVisits } = friendIds.length
      ? await supabaseAdmin
          .from("venue_visits")
          .select("venue_id, profile_id, arrived")
          .in("venue_id", venueIds)
          .in("profile_id", friendIds)
          .gte("arrived", sinceISO)
      : { data: [] as any[] };

    // Optional: likes/ratings from venue_interactions
    const { data: friendLikes } = friendIds.length
      ? await supabaseAdmin
          .from("venue_interactions")
          .select("venue_id, interaction_type, weight")
          .in("venue_id", venueIds)
          .in("profile_id", friendIds)
          .in("interaction_type", ["like", "rating"])
      : { data: [] as any[] };

    const visitsByVenue = new Map<UUID, any[]>();
    (friendVisits ?? []).forEach((row) => {
      const arr = visitsByVenue.get(row.venue_id) || [];
      arr.push(row);
      visitsByVenue.set(row.venue_id, arr);
    });
    const likesByVenue = new Map<UUID, any[]>();
    (friendLikes ?? []).forEach((row) => {
      const arr = likesByVenue.get(row.venue_id) || [];
      arr.push(row);
      likesByVenue.set(row.venue_id, arr);
    });

    // Helpers ---------------------------------------------------------
    const hourLabel = (h: number) => {
      const d = new Date(); d.setHours(h, 0, 0, 0);
      return d.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase();
    };
    const windowLabel = (h: number) => `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`;
    const sum = (a: number, b: number) => a + b;
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    function buildExplain(item: any): any {
      const ven = venueById[item.venue_id] || {};
      const hourly: number[] = ven?.popularity_hourly || [];
      const now = new Date();
      const hour = now.getHours();
      const peakIdx = hourly.length ? hourly.reduce((m, v, i, arr) => (v > arr[m] ? i : m), 0) : hour;
      const peakVal = hourly[peakIdx] || 0;
      const currVal = hourly[hour] || 0;
      const live = typeof ven.live_count === "number" ? ven.live_count : null;
      const currentCapacityPct =
        live != null && peakVal > 0 ? clamp01(live / Math.max(peakVal, 1)) : (currVal && peakVal ? clamp01(currVal / peakVal) : undefined);

      const friends = visitsByVenue.get(item.venue_id) || [];
      const friendsVisitedCount = friends.length;
      const friendsRecent = friends.slice(0, 3).map((r: any) => ({ name: "Friend", when: new Date(r.arrived).toLocaleDateString() }));
      const likes = likesByVenue.get(item.venue_id) || [];
      const friendRating =
        likes.length
          ? (() => {
              const ratings = likes.filter((l: any) => l.interaction_type === "rating").map((l: any) => Number(l.weight)).filter(Number.isFinite);
              if (!ratings.length) return null;
              const avg = ratings.reduce(sum, 0) / ratings.length;
              return Math.round(avg * 10) / 10;
            })()
          : null;
      const compatibilityPct = clamp01((likes.filter((l: any) => l.interaction_type === "like").length || 0) / Math.max(friendIds.length, 1));

      const w = item.weights || {};
      const c = item.components || {};
      const weighted = (c.weighted || {}) as Record<string, number>;
      const score = Number(item.score) || 0;
      const confidence = clamp01(score); // simple proxy; you can map to [0.6..0.98] if you prefer

      const topReasons: string[] = [];
      if ((item.badges || []).includes("Walkable")) topReasons.push("Close enough to walk");
      if ((item.badges || []).includes("Top rated")) topReasons.push("Great ratings lately");
      if ((item.badges || []).includes("Popular now")) topReasons.push("Good crowd right now");
      if ((item.badges || []).includes("In budget")) topReasons.push("Fits your budget");
      if ((item.badges || []).includes("Matches vibe")) topReasons.push("Vibe match for this moment");

      return {
        why: item.reason || "Good fit for your current vibe",
        badges: item.badges || [],
        components: { ...c, weighted }, // expose both raw + weighted
        weights: w,
        weighted,
        confidence,
        crowd: {
          currentCapacityPct,
          predictedPeakWindow: windowLabel(peakIdx),
          predictedPeakReason: hourly.length ? "Based on typical hourly activity" : undefined,
          currentWaitMins: currentCapacityPct != null ? Math.round(currentCapacityPct * 20) : undefined, // heuristic
        },
        social: {
          friendsVisitedCount,
          friendsRecent,
          friendRating,
          compatibilityPct,
        },
        context: {
          walkMin: item.walk_min,
          inBudget: (item.badges || []).includes("In budget"),
        },
        topReasons,
      };
    }

    const items = recs.map((r: any) => ({
      ...r,
      explain: buildExplain(r),
    }));

    // Optional: LLM re-rank
    if (DO_RERANK && OPENAI_API_KEY) {
      // keep your current stub; ensure it only runs when enabled
    }

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    const headers = corsHeadersFor(req);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});