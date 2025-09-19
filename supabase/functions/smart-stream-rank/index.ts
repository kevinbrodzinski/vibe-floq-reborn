import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
};

// Types
type SmartFilter = "all"|"unread"|"rally"|"photos"|"plans"|"wings";
type SmartItem = {
  id: string;
  kind: "rally"|"moment"|"plan"|"message"|"wings_poll"|"wings_time"|"wings_meet"|"venue_suggestion"|"reminder"|"recap";
  created_at: string;
  score: number;
  unread: boolean;
  title?: string; 
  body?: string;
  media?: { thumb_url: string }[];
  rally?: { venue: string; at: string; counts:{going:number; maybe:number; noreply:number} };
  plan?:  { title: string; at: string; status:"locked"|"building"|"tentative" };
  meta?: { card_kind?: string; payload?: any; confidence?: number };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    type StreamMode = "floq" | "field";
    const { floq_id, filter = "all", last_seen_ts, mode = "floq", viewer_lat, viewer_lng } = await req.json() as {
      floq_id?: string;
      filter?: SmartFilter;
      last_seen_ts?: string | null;
      mode?: StreamMode;
      viewer_lat?: number;
      viewer_lng?: number;
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

    // Fetch data based on mode
    let fetchPromises: Promise<any>[] = [];
    
    if (mode === "floq" && floq_id) {
      // Floq stream: messages, moments, plans, wings, floq rallies
      fetchPromises = [
        supabase
          .from("floq_messages")
          .select("id, floq_id, sender_id, body, created_at")
          .eq("floq_id", floq_id)
          .neq("delivery_state", "deleted")
          .order("created_at", { ascending: false })
          .limit(100),
        
        supabase
          .from("floq_afterglow")
          .select("id, created_at")
          .eq("floq_id", floq_id)
          .order("created_at", { ascending: false })
          .limit(50),
        
        supabase
          .from("floq_plans")
          .select("id, title, planned_at, status, created_at, locked_at")
          .eq("floq_id", floq_id)
          .is("archived_at", null)
          .order("planned_at", { ascending: false })
          .limit(50),
        
        supabase
          .from("floq_wings_events")
          .select("id, kind, payload, created_at, confidence, status")
          .eq("floq_id", floq_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(30),
        
        supabase
          .from("rallies")
          .select("id, creator_id, created_at, expires_at, status, venue_id, scope, floq_id, center, note")
          .eq("status", "active")
          .eq("scope", "floq")
          .eq("floq_id", floq_id)
          .order("expires_at", { ascending: false })
          .limit(50)
      ];
    } else {
      // Field stream: only field rallies (filtered by RLS)
      fetchPromises = [
        Promise.resolve({ data: [], error: null }), // messages
        Promise.resolve({ data: [], error: null }), // moments
        Promise.resolve({ data: [], error: null }), // plans
        Promise.resolve({ data: [], error: null }), // wings
        supabase
          .from("rallies")
          .select("id, creator_id, created_at, expires_at, status, venue_id, scope, center, note")
          .eq("status", "active")
          .eq("scope", "field")
          .order("expires_at", { ascending: false })
          .limit(50)
      ];
    }

    const [msgsRes, momentsRes, plansRes, wingsRes, ralliesRes] = await Promise.all(fetchPromises);
    
    if (msgsRes.error) console.error("Messages error:", msgsRes.error);
    if (momentsRes.error) console.error("Moments error:", momentsRes.error);
    if (plansRes.error) console.error("Plans error:", plansRes.error);
    if (wingsRes.error) console.error("Wings error:", wingsRes.error);
    if (ralliesRes.error) console.error("Rallies error:", ralliesRes.error);

    const msgs = msgsRes.data || [];
    const moments = momentsRes.data || [];
    const plans = plansRes.data || [];
    const wings = wingsRes.data || [];
    const rallies = ralliesRes.data || [];

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
      kind: "message",
      created_at: m.created_at,
      score: 0,        // base recency; will score below
      unread: watermark ? (m.created_at > watermark && m.sender_id !== viewer) : true,
      body: m.body ?? ""
    }));

    const momentItems: SmartItem[] = (moments ?? []).map(a => ({
      id: a.id,
      kind: "moment",
      created_at: a.created_at ?? new Date().toISOString(),
      score: 0,
      unread: watermark ? ((a.created_at ?? "") > watermark) : true,
      title: "Moment"
      // media: [] // integrate thumbs when you link assets
    }));

    const planItems: SmartItem[] = (plans ?? []).map(p => ({
      id: p.id,
      kind: "plan",
      created_at: (p.locked_at ?? p.created_at ?? p.planned_at ?? new Date().toISOString()),
      score: 0,
      unread: watermark ? (((p.locked_at ?? p.created_at ?? p.planned_at) ?? "") > watermark) : true,
      plan: { title: p.title, at: (p.planned_at ?? ""), status: (p.status ?? "building") as any }
    }));

    const cardItems: SmartItem[] = (wings ?? []).map(c => {
      // Map wings kinds to consistent naming
      let mappedKind: any = c.kind;
      if (c.kind === 'poll') mappedKind = 'wings_poll';
      if (c.kind === 'time_picker') mappedKind = 'wings_time';  
      if (c.kind === 'meet_halfway') mappedKind = 'wings_meet';
      
      return {
        id: c.id,
        kind: mappedKind,
        created_at: c.created_at,
        score: 0, // scored below
        unread: watermark ? c.created_at > watermark : true,
        title: c.payload?.title || "Wings Suggestion",
        meta: { card_kind: c.kind, payload: c.payload, confidence: c.confidence }
      };
    });

    // Create rally items
    const rallyItems: SmartItem[] = (rallies ?? []).map(rally => {
      const timeUntilExpiry = new Date(rally.expires_at).getTime() - Date.now();
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
      
      return {
        id: rally.id,
        kind: "rally" as any,
        created_at: rally.created_at,
        score: 0, // Will be calculated below
        unread: watermark ? (rally.created_at > watermark) : true,
        meta: {
          creator_id: rally.creator_id,
          expires_at: rally.expires_at,
          venue_id: rally.venue_id,
          scope: rally.scope,
          floq_id: rally.floq_id,
          center: rally.center,
          note: rally.note,
          minutes_until_expiry: minutesUntilExpiry
        }
      };
    });

    // Merge
    let items: SmartItem[] = [...textItems, ...momentItems, ...planItems, ...cardItems, ...rallyItems];

    // Score (simple, effective)
    const now = Date.now();
    const decay = (tIso: string) => {
      const ageMin = Math.max(0, (now - new Date(tIso).getTime()) / 60000);
      // half-life ~ 6h
      return Math.pow(0.5, ageMin / 360);
    };

    items = items.map(i => {
      let score = 0.0 + 0.6 * decay(i.created_at);

      if (i.kind === "message" && i.id && mentioned.has(i.id)) score += 0.2;
      if (i.kind === "moment") score += 0.15 * decay(i.created_at); // recent photo
      if (i.kind === "plan" && i.plan?.at) {
        const minutesTo = (new Date(i.plan.at).getTime() - now)/60000;
        if (minutesTo >= 0 && minutesTo <= 180) score += 0.25; // upcoming in 3h
        if ((plans ?? []).find(p=>p.id===i.id)?.locked_at) score += 0.15;
      }
      
      // Wings Cards scoring
      if (i.kind === "wings_poll") score += 0.18 + 0.2 * (i.meta?.confidence ?? 0);
      if (i.kind === "wings_time") score += 0.15;
      if (i.kind === "wings_meet") score += 0.25; // highly actionable
      if (i.kind === "venue_suggestion") score += 0.20;
      
      // Rally scoring
      if (i.kind === "rally") {
        const minutesUntilExpiry = i.meta?.minutes_until_expiry || 0;
        
        // Rally expiring in ≤ 90m gets significant boost
        if (minutesUntilExpiry <= 90 && minutesUntilExpiry > 0) {
          score += 0.40;
        }
        
        // Recent rallies get slight boost
        const ageHours = (now - new Date(i.created_at).getTime()) / (1000 * 60 * 60);
        if (ageHours <= 2) {
          score += 0.15;
        }
      }
      
      return { ...i, score: Math.min(1, Math.max(0, score)) };
    });

    // Filter
    const isUnread = (i: SmartItem) => watermark ? i.created_at > watermark : i.unread;
    if (filter === "unread") items = items.filter(isUnread);
    if (filter === "rally")  items = items.filter(i => i.kind === "rally");
    if (filter === "photos") items = items.filter(i => i.kind === "moment");
    if (filter === "plans")  items = items.filter(i => i.kind === "plan");
    if (filter === "wings")  items = items.filter(i => ["wings_poll", "wings_time", "wings_meet", "venue_suggestion"].includes(i.kind));

    // Sort: score desc, then created_at desc
    items.sort((a,b) => (b.score - a.score) || b.created_at.localeCompare(a.created_at));

    const unread_count = [...textItems, ...momentItems, ...planItems].filter(isUnread).length;

    return new Response(JSON.stringify({ items, unread_count }), {
      headers: { ...CORS, "Content-Type":"application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: CORS });
  }
});
