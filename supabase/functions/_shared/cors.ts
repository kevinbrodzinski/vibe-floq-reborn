// Shared CORS utilities for edge functions
export function corsHeaders(origin: string | null = null) {
  const allowOrigin = origin ?? '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    // Include ALL headers your app sends, including 'range-unit' for map tiles
    'Access-Control-Allow-Headers': 
      'authorization, x-client-info, apikey, content-type, range, range-unit, x-requested-with, cache-control',
  };
}

export function corsHeadersFor(req: Request) {
  return corsHeaders(req.headers.get('origin'));
}

export function handlePreflight(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req.headers.get('origin')) });
  }
  return null;
}

// Legacy export for backward compatibility - default headers for simple cases
export const defaultCorsHeaders = corsHeaders();