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
  kind: "text"|"moment"|"plan"|"rally"|"wings_poll"|"wings_time"|"wings_meet"|"venue_suggestion"|"reminder"|"recap";
  ts: string;
  priority: number;
  unread: boolean;
  title?: string; 
  body?: string;
  media?: { thumb_url: string }[];
  rally?: { venue: string; at: string; counts:{going:number; maybe:number; noreply:number}; scope?: "field"|"floq" };
  plan?:  { title: string; at: string; status:"locked"|"building"|"tentative" };
  meta?: { card_kind?: string; payload?: any; confidence?: number; [key: string]: any };
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
          .select("id, creator_id, created_at, expires_at, status, venue_id, scope, floq_id, note")
          .eq("status", "active")
          .eq("scope", "floq")
          .eq("floq_id", floq_id)
          .order("expires_at", { ascending: false })
          .limit(50)
      ];
    } else {
      // Field stream: only field rallies (filtered by distance if lat/lng provided)
      let fieldRalliesPromise;
      if (typeof viewer_lat === "number" && typeof viewer_lng === "number") {
        // Use RPC for friend+distance filtering
        fieldRalliesPromise = supabase.rpc("rallies_field_nearby", {
          lat: viewer_lat, lng: viewer_lng, radius_m: 4000,
        });
      } else {
        // Fallback to RLS-only
        fieldRalliesPromise = supabase
          .from("rallies")
          .select("id, creator_id, created_at, expires_at, status, venue_id, scope, note")
          .eq("status", "active")
          .eq("scope", "field")
          .order("expires_at", { ascending: false })
          .limit(50);
      }
      
      fetchPromises = [
        Promise.resolve({ data: [], error: null }), // messages
        Promise.resolve({ data: [], error: null }), // moments
        Promise.resolve({ data: [], error: null }), // plans
        Promise.resolve({ data: [], error: null }), // wings
        fieldRalliesPromise
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
      kind: "text",
      ts: m.created_at,
      priority: 0,        // base recency; will score below
      unread: watermark ? (m.created_at > watermark && m.sender_id !== viewer) : true,
      body: m.body ?? ""
    }));

    const momentItems: SmartItem[] = (moments ?? []).map(a => ({
      id: a.id,
      kind: "moment",
      ts: a.created_at ?? new Date().toISOString(),
      priority: 0,
      unread: watermark ? ((a.created_at ?? "") > watermark) : true,
      title: "Moment"
      // media: [] // integrate thumbs when you link assets
    }));

    const planItems: SmartItem[] = (plans ?? []).map(p => ({
      id: p.id,
      kind: "plan",
      ts: (p.locked_at ?? p.created_at ?? p.planned_at ?? new Date().toISOString()),
      priority: 0,
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
        ts: c.created_at,
        priority: 0, // scored below
        unread: watermark ? c.created_at > watermark : true,
        title: c.payload?.title || "Wings Suggestion",
        meta: { card_kind: c.kind, payload: c.payload, confidence: c.confidence }
      };
    });

    // Get rally counts
    const rallyIds = (rallies ?? []).map(r => r.id);
    let countsMap = new Map<string, { going:number; maybe:number; noreply:number }>();
    if (rallyIds.length) {
      const { data: inv } = await supabase
        .from("rally_invites")
        .select("rally_id, status")
        .in("rally_id", rallyIds);
      for (const id of rallyIds) countsMap.set(id, { going:0, maybe:0, noreply:0 });
      (inv ?? []).forEach(row => {
        const c = countsMap.get(row.rally_id)!;
        if (row.status === "joined") c.going++;
        else if (row.status === "pending") c.noreply++;
      });
    }

    // Create rally items
    const rallyItems: SmartItem[] = (rallies ?? []).map(rally => {
      const timeUntilExpiry = new Date(rally.expires_at).getTime() - Date.now();
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
      
      return {
        id: rally.id,
        kind: "rally" as any,
        ts: rally.created_at,
        priority: 0, // Will be calculated below
        unread: watermark ? (rally.created_at > watermark) : true,
        rally: {
          venue: rally.venue_id ? `#${rally.venue_id}` : "Meet-halfway",
          at: rally.expires_at,
          counts: countsMap.get(rally.id) ?? { going: 0, maybe: 0, noreply: 0 },
          scope: rally.scope
        },
        meta: {
          creator_id: rally.creator_id,
          expires_at: rally.expires_at,
          venue_id: rally.venue_id,
          scope: rally.scope,
          floq_id: rally.floq_id,
          note: rally.note,
          minutes_until_expiry: minutesUntilExpiry
        }
      };
    });

    // Merge
    let items: SmartItem[] = [...textItems, ...momentItems, ...planItems, ...cardItems, ...rallyItems];

    // Score (simple, effective)
    const now = Date.now();
    items = items.map(i => {
      let score = 0.6 * Math.pow(0.5, Math.max(0, (now - new Date(i.ts).getTime()) / 60000) / 360);

      if (i.kind === "text" && i.id && mentioned.has(i.id)) score += 0.20;
      if (i.kind === "moment") score += 0.15;
      if (i.kind === "plan" && i.plan?.at) {
        const minTo = (new Date(i.plan.at).getTime() - now) / 60000;
        if (minTo >= 0 && minTo <= 180) score += 0.25;
      }
      if (i.kind === "rally" && i.meta?.minutes_until_expiry !== undefined) {
        const m = i.meta.minutes_until_expiry;
        if (m >= 0 && m <= 90) score += 0.40;
        const g = i.rally?.counts.going ?? 0; 
        if (g >= 4) score += 0.10;
      }
      
      // Wings Cards scoring
      if (i.kind === "wings_poll") score += 0.18 + 0.2 * (i.meta?.confidence ?? 0);
      if (i.kind === "wings_time") score += 0.15;
      if (i.kind === "wings_meet") score += 0.25;
      if (i.kind === "venue_suggestion") score += 0.20;
      
      return { ...i, priority: Math.min(1, Math.max(0, score)) };
    });

    // Filter
    const isUnread = (i: SmartItem) => watermark ? i.ts > watermark : i.unread;
    if (filter === "unread") items = items.filter(isUnread);
    if (filter === "rally")  items = items.filter(i => i.kind === "rally");
    if (filter === "photos") items = items.filter(i => i.kind === "moment");
    if (filter === "plans")  items = items.filter(i => i.kind === "plan");
    if (filter === "wings")  items = items.filter(i => ["wings_poll", "wings_time", "wings_meet", "venue_suggestion"].includes(i.kind));

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
