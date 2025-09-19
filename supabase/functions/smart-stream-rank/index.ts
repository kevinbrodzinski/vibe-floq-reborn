import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
};

type SmartFilter = "all"|"unread"|"rally"|"photos"|"plans";
type SmartItem = {
  id: string;
  kind: "rally"|"moment"|"plan"|"text";
  ts: string;                  // ISO
  priority: number;            // 0..1
  unread: boolean;
  title?: string;
  body?: string;
  media?: { thumb_url: string }[];
  rally?: { venue: string; at: string; counts:{going:number; maybe:number; noreply:number} };
  plan?:  { title: string; at: string; status:"locked"|"building"|"tentative" };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { floq_id, filter = "all", last_seen_ts } = await req.json() as {
      floq_id: string;
      filter?: SmartFilter;
      last_seen_ts?: string | null;
    };
    if (!floq_id) throw new Error("floq_id required");

    // TODO: 1) Fetch rallies/moments/plans/messages from your existing tables/views
    //       2) Compute priority weights server-side (start-soon rally +0.4, locked plan today +0.15, recent moment +0.15, mention +0.2, recency decay)
    // For now, return a deterministic demo payload so UI is wired end-to-end.

    const now = new Date();
    const iso = (m:number) => new Date(now.getTime() - m*60*1000).toISOString();
    const mock: SmartItem[] = [
      { id:"r1", kind:"rally", ts: iso(5),  priority:0.92, unread:true,
        rally:{ venue:"Gran Blanco", at:new Date(now.getTime()+60*60*1000).toISOString(),
                counts:{going:3, maybe:2, noreply:3} }, title:"Tom started a Rally" },
      { id:"m1", kind:"moment", ts: iso(12), priority:0.70, unread:true,
        media:[{ thumb_url:"/thumbs/moment1.jpg" }], title:"Sarah shared a moment" },
      { id:"p1", kind:"plan",  ts: iso(40), priority:0.66, unread:false,
        plan:{ title:"Friday Dinner @ Koi Sushi · 7:30pm", at: iso(-1440), status:"building" } },
      { id:"t1", kind:"text",  ts: iso(55), priority:0.30, unread:false, body:"Crew meetup ideas for Saturday?" },
    ];

    let items = mock;

    // filter - fixed: keep as ISO string for comparison
    const ucut = last_seen_ts ?? null;
    const isUnread = (i:SmartItem) => (ucut ? i.ts > ucut : !!i.unread);
    if (filter === "unread") items = items.filter(isUnread);
    if (filter === "rally")  items = items.filter(i => i.kind === "rally");
    if (filter === "photos") items = items.filter(i => i.kind === "moment");
    if (filter === "plans")  items = items.filter(i => i.kind === "plan");

    // sort: priority desc, then ts desc
    items = items.sort((a,b) => (b.priority - a.priority) || (b.ts.localeCompare(a.ts)));

    const unread_count = mock.filter(isUnread).length;

    return new Response(JSON.stringify({ items, unread_count }), {
      headers: { ...CORS, "Content-Type":"application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error:String(e) }), { status:400, headers: CORS });
  }
});
