// Shared CORS utilities for edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function corsHeadersFor(req: Request) {
  return corsHeaders;
}

export function handlePreflight(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}