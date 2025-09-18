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
    const { floq_id } = await req.json();
    
    return new Response(JSON.stringify({
      members: [],
      meet_halfway: null,
      receipt: { 
        policy_fingerprint: "hq-proximity-v1", 
        floq_id 
      }
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