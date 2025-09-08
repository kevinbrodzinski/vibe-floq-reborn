// supabase/functions/suggest-subgroups/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Req = { plan_id: string };

type Participant = {
  profile_id: string | null;
  rsvp_status: string | null;
  role: string | null;
};

function uniq<T>(a: T[]) { return Array.from(new Set(a)); }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { plan_id } = (await req.json()) as Req;
    if (!plan_id) {
      return new Response(JSON.stringify({ error: "plan_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );

    // 1) Load plan + participants
    const { data: plan, error: planErr } = await supabase
      .from("floq_plans")
      .select("id, creator_id, planned_at")
      .eq("id", plan_id)
      .single();
    if (planErr) throw planErr;

    const { data: parts, error: pErr } = await supabase
      .from("plan_participants")
      .select("profile_id, rsvp_status, role")
      .eq("plan_id", plan_id);
    if (pErr) throw pErr;

    const P: Participant[] = (parts ?? []).filter(p => !!p.profile_id) as any;
    const ids = P.map(p => p.profile_id!) as string[];

    if (ids.length < 4) {
      // Don't suggest splitting tiny groups
      return new Response(JSON.stringify({
        ok: false, reason: "Group too small to split", groups: [{ members: ids, cohesion: 1.0 }]
      }), { headers: corsHeaders });
    }

    // 2) Optional: pull "likes" (swipe_right) from activities for current plan
    const { data: votes } = await supabase
      .from("plan_activities")
      .select("profile_id, metadata")
      .eq("plan_id", plan_id)
      .eq("activity_type", "vote_cast");

    const likedBy: Record<string, Set<string>> = {};
    for (const v of votes ?? []) {
      const pid = (v as any).profile_id as string | null;
      const m = (v as any).metadata ?? {};
      if (!pid || m?.action !== "swipe_right" || !m?.venue_id) continue;
      likedBy[pid] ??= new Set<string>();
      likedBy[pid].add(m.venue_id);
    }

    // 3) If caller is creator, fetch co-plans they created (last 180 days)
    let creatorCoplanMap: Record<string, Set<string>> = {};
    const isCreator = plan?.creator_id != null; // RLS will still govern results
    if (isCreator) {
      const since = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();
      // Plans created by the same creator within 180d, participants limited by RLS
      const { data: copart } = await supabase
        .from("plan_participants")
        .select("profile_id, plan_id, floq_plans!inner(creator_id, planned_at)")
        .gte("floq_plans.planned_at", since)
        .eq("floq_plans.creator_id", plan.creator_id);
      // Build map profile_id -> set(plan_id)
      creatorCoplanMap = {};
      for (const r of copart ?? []) {
        const pid = (r as any).profile_id as string | null;
        const pidPlan = (r as any).plan_id as string | null;
        if (!pid || !pidPlan) continue;
        if (!ids.includes(pid)) continue; // only track for current group members
        (creatorCoplanMap[pid] ??= new Set<string>()).add(pidPlan);
      }
    }

    // 4) Build pairwise affinity
    const idx: Record<string, number> = {};
    ids.forEach((id, i) => (idx[id] = i));
    const n = ids.length;
    const A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    const RSVP_WEIGHT = {
      accepted: 0.40, maybe: 0.20, pending: 0.0, declined: -0.20
    } as Record<string, number>;

    // RSVP contribution
    const rsvpOf: Record<string, string> = {};
    for (const p of P) rsvpOf[p.profile_id!] = (p.rsvp_status ?? "pending");

    // likes overlap contribution
    const likeOverlap = (a: string, b: string) => {
      const sa = likedBy[a]; const sb = likedBy[b];
      if (!sa || !sb) return 0;
      const common = [...sa].filter(x => sb.has(x)).length;
      if (common <= 0) return 0;
      return Math.min(0.20, 0.10 + 0.10 * Math.min(common, 3) / 3);
    };

    // co-plan contribution (creator scope)
    const coplanOverlap = (a: string, b: string) => {
      const sa = creatorCoplanMap[a]; const sb = creatorCoplanMap[b];
      if (!sa || !sb || sa.size === 0 || sb.size === 0) return 0;
      const ia = [...sa].filter(x => sb.has(x)).length;
      const denom = Math.min(sa.size, sb.size);
      const norm = denom > 0 ? ia / denom : 0;
      return Math.min(0.30, 0.30 * norm);
    };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const idA = ids[i], idB = ids[j];
        const rA = rsvpOf[idA] ?? "pending";
        const rB = rsvpOf[idB] ?? "pending";
        let aij = 0;
        if (rA === "accepted" && rB === "accepted") aij += RSVP_WEIGHT.accepted;
        else if (rA === "maybe" && rB === "maybe") aij += RSVP_WEIGHT.maybe;
        else if ((rA === "declined") !== (rB === "declined")) aij += RSVP_WEIGHT.declined;

        aij += likeOverlap(idA, idB);
        aij += coplanOverlap(idA, idB);

        A[i][j] = aij;
        A[j][i] = aij;
      }
    }

    // 5) Choose seeds: pair with *lowest* affinity
    let minVal = Number.POSITIVE_INFINITY, s1 = 0, s2 = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (A[i][j] < minVal) { minVal = A[i][j]; s1 = i; s2 = j; }
      }
    }

    // 6) Assign others greedily
    const G1 = new Set<number>([s1]);
    const G2 = new Set<number>([s2]);

    for (let k = 0; k < n; k++) {
      if (k === s1 || k === s2) continue;
      const sum1 = [...G1].reduce((acc, i) => acc + A[k][i], 0);
      const sum2 = [...G2].reduce((acc, i) => acc + A[k][i], 0);
      if (sum1 >= sum2) G1.add(k); else G2.add(k);
    }

    const groupA = [...G1].map(i => ids[i]);
    const groupB = [...G2].map(i => ids[i]);

    // Cohesion scores (mean internal affinity)
    const coh = (G: number[]) => {
      if (G.length <= 1) return 0;
      let s = 0, c = 0;
      for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) { s += A[G[i]][G[j]]; c++; }
      return c ? s / c : 0;
    };
    const cA = coh([...G1]), cB = coh([...G2]);

    // 7) Build rationale
    const reasons: string[] = [];
    if (creatorCoplanMap && Object.keys(creatorCoplanMap).length)
      reasons.push("Prior co-plans considered (creator scope)");
    if (Object.keys(likedBy).length) reasons.push("Similar venue likes grouped");
    reasons.push("RSVP alignment grouped");

    // 8) Log the suggestion (can be expanded later with group_receipts table)
    console.log("Subgroup suggestion computed", { groupA, groupB, cohesion: { A: cA, B: cB }, reasons });

    return new Response(JSON.stringify({
      ok: true,
      groups: [
        { label: "Group A", members: groupA, cohesion: Number(cA.toFixed(3)) },
        { label: "Group B", members: groupB, cohesion: Number(cB.toFixed(3)) },
      ],
      reasons
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: corsHeaders
    });
  }
});