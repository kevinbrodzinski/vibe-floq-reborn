import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
};

// Types
type SmartFilter = "all"|"unread"|"rally"|"photos"|"plans";
type SmartItem = {
  id: string;
  kind: "rally"|"moment"|"plan"|"text";
  ts: string;
  priority: number;
  unread: boolean;
  title?: string; body?: string;
  media?: { thumb_url: string }[];
  rally?: { venue: string; at: string; counts:{going:number; maybe:number; noreply:number} };
  plan?:  { title: string; at: string; status:"locked"|"building"|"tentative" };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { floq_id, filter = "all", last_seen_ts } = await req.json() as {
      floq_id: string; filter?: SmartFilter; last_seen_ts?: string|null;
    };
    if (!floq_id) throw new Error("floq_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // viewer
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) throw new Error("auth required");
    const viewer = user.id;
    const watermark = last_seen_ts ?? null;

    // 1) Messages (text) — exclude deleted
    const { data: msgs, error: mErr } = await supabase
      .from("floq_messages")
      .select("id, floq_id, sender_id, body, created_at")
      .eq("floq_id", floq_id)
      .neq("delivery_state", "deleted")
      .order("created_at", { ascending: false })
      .limit(100);
    if (mErr) throw mErr;

    // Mentions for nudge (only those targeting viewer)
    const msgIds = (msgs ?? []).map(m => m.id);
    let mentioned = new Set<string>();
    if (msgIds.length) {
      const { data: ment, error: mentErr } = await supabase
        .from("floq_message_mentions")
        .select("message_id")
        .in("message_id", msgIds)
        .eq("target_type", "profile")
        .eq("target_id", viewer);
      if (!mentErr && ment) mentioned = new Set(ment.map(x => x.message_id));
    }

    const textItems: SmartItem[] = (msgs ?? []).map(m => ({
      id: m.id,
      kind: "text",
      ts: m.created_at,
      priority: 0,        // base recency; will score below
      unread: watermark ? (m.created_at > watermark && m.sender_id !== viewer) : true,
      body: m.body ?? ""
    }));

    // 2) Moments/photos — from afterglow (treat as "moment")
    const { data: moments, error: moErr } = await supabase
      .from("floq_afterglow")
      .select("id, created_at")
      .eq("floq_id", floq_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (moErr) throw moErr;

    const momentItems: SmartItem[] = (moments ?? []).map(a => ({
      id: a.id,
      kind: "moment",
      ts: a.created_at ?? new Date().toISOString(),
      priority: 0,
      unread: watermark ? ((a.created_at ?? "") > watermark) : true,
      title: "Moment"
      // media: [] // integrate thumbs when you link assets
    }));

    // 3) Plans — surface upcoming/locked & recently edited ones
    const { data: plans, error: pErr } = await supabase
      .from("floq_plans")
      .select("id, title, planned_at, status, created_at, locked_at")
      .eq("floq_id", floq_id)
      .is("archived_at", null)
      .order("planned_at", { ascending: false })
      .limit(50);
    if (pErr) throw pErr;

    const planItems: SmartItem[] = (plans ?? []).map(p => ({
      id: p.id,
      kind: "plan",
      ts: (p.locked_at ?? p.created_at ?? p.planned_at ?? new Date().toISOString()),
      priority: 0,
      unread: watermark ? (((p.locked_at ?? p.created_at ?? p.planned_at) ?? "") > watermark) : true,
      plan: { title: p.title, at: (p.planned_at ?? ""), status: (p.status ?? "building") as any }
    }));

    // Merge
    let items: SmartItem[] = [...textItems, ...momentItems, ...planItems];

    // Score (simple, effective)
    const now = Date.now();
    const decay = (tIso: string) => {
      const ageMin = Math.max(0, (now - new Date(tIso).getTime()) / 60000);
      // half-life ~ 6h
      return Math.pow(0.5, ageMin / 360);
    };

    items = items.map(i => {
      let score = 0.0 + 0.6 * decay(i.ts);

      if (i.kind === "text" && i.id && mentioned.has(i.id)) score += 0.2;
      if (i.kind === "moment") score += 0.15 * decay(i.ts); // recent photo
      if (i.kind === "plan" && i.plan?.at) {
        const minutesTo = (new Date(i.plan.at).getTime() - now)/60000;
        if (minutesTo >= 0 && minutesTo <= 180) score += 0.25; // upcoming in 3h
        if ((plans ?? []).find(p=>p.id===i.id)?.locked_at) score += 0.15;
      }
      // Future: rally items (once you store rallies separately) → +0.4 within 90m
      return { ...i, priority: Math.min(1, Math.max(0, score)) };
    });

    // Filter
    const isUnread = (i: SmartItem) => watermark ? i.ts > watermark : i.unread;
    if (filter === "unread") items = items.filter(isUnread);
    if (filter === "rally")  items = items.filter(i => i.kind === "rally");
    if (filter === "photos") items = items.filter(i => i.kind === "moment");
    if (filter === "plans")  items = items.filter(i => i.kind === "plan");

    // Sort: priority desc, then ts desc
    items.sort((a,b) => (b.priority - a.priority) || b.ts.localeCompare(a.ts));

    const unread_count = [...textItems, ...momentItems, ...planItems].filter(isUnread).length;

    return new Response(JSON.stringify({ items, unread_count }), {
      headers: { ...CORS, "Content-Type":"application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: CORS });
  }
});
