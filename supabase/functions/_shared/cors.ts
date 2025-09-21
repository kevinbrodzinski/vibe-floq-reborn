export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  const acrh = req.headers.get('access-control-request-headers') ?? '';
  // baseline headers we know we use, plus echo whatever the client asked for
  const allowHeaders = [
    'authorization', 'x-client-info', 'apikey', 'content-type',
    'range', 'range-unit', 'cache-control', 'x-requested-with'
  ];
  const requested = acrh.split(',').map(h => h.trim()).filter(Boolean);
  const headerSet = Array.from(new Set([...allowHeaders, ...requested]));

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin, Access-Control-Request-Headers',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': headerSet.join(', '),
    'Access-Control-Max-Age': '86400', // 24h
  };

  return { origin, headers };
}

export function handlePreflight(req: Request) {
  if (req.method !== 'OPTIONS') return null;
  const { headers } = buildCorsHeaders(req);
  return new Response(null, { status: 204, headers });
}

// Convenience wrappers so all responses include CORS
export function okJSON(body: unknown, req: Request, status = 200) {
  const { headers } = buildCorsHeaders(req);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'content-type': 'application/json' },
  });
}

export function okJSONCached(body: unknown, req: Request, ttlSec = 300) {
  const { headers } = buildCorsHeaders(req);
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...headers,
      'content-type': 'application/json',
      'cache-control': `public, max-age=${ttlSec}`,
    },
  });
}

export function badJSON(message: string, req: Request, status = 400) {
  const { headers } = buildCorsHeaders(req);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...headers, 'content-type': 'application/json' },
  });
}

// Legacy exports for backward compatibility
export function corsHeaders(origin: string | null = null) {
  const allowOrigin = origin ?? '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 
      'authorization, x-client-info, apikey, content-type, range, range-unit, x-requested-with, cache-control',
  };
}

export function corsHeadersFor(req: Request) {
  return corsHeaders(req.headers.get('origin'));
}

export const defaultCorsHeaders = corsHeaders();