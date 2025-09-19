import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null,{headers:CORS});
  try {
    const { floq_id } = await req.json();
    if (!floq_id) throw new Error("floq_id required");
    // TODO: upsert into floq_stream_reads(profile_id, floq_id, last_seen_ts = now())
    return new Response(JSON.stringify({ ok:true, last_seen_ts: new Date().toISOString() }), { 
      headers: { ...CORS, "Content-Type":"application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error:String(e) }), { status:400, headers:CORS });
  }
});