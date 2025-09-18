import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { floq_id, since, categories } = await req.json();
    const now = new Date().toISOString();
    
    const summary = { 
      decisions: [], 
      rallies: [], 
      mentions: [], 
      plans: [] 
    };
    
    const receipt = { 
      policy_fingerprint: "hq-digest-v1", 
      since: since ?? null, 
      categories: categories ?? null 
    };
    
    return new Response(JSON.stringify({
      summary,
      last_digest_at: now,
      receipt
    }), { 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});