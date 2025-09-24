export type CorsKit = {
  headers: Record<string, string>;
  preflight: Response | null;
  json: (body: unknown, status?: number, ttlSec?: number) => Response;
  error: (message: string, status?: number) => Response;
};

export function buildCors(req: Request, defaultTtlSec = 300): CorsKit {
  const origin = req.headers.get('origin') ?? '*';

  // What headers did the browser say it wants to send?
  const requested = (req.headers.get('access-control-request-headers') ?? '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);

  // Baseline headers we know we use; keep them lowercase (browsers lowercase ACRH)
  const allow = new Set([
    'authorization',
    'apikey',
    'content-type',
    'x-client-info',
    'range',
    'range-unit',
    'accept-profile',
    'prefer',
    'if-none-match',
    'x-requested-with',
    'cache-control',
  ]);
  requested.forEach(h => allow.add(h.toLowerCase()));

  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': Array.from(allow).join(', '),
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'content-range, range-unit', // lets clients/readers see Content-Range
    // So proxies/CDNs don't collapse different origins/headers
    'Vary': 'Origin, Access-Control-Request-Headers',
  };

  const json = (body: unknown, status = 200, ttlSec = defaultTtlSec) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...baseHeaders,
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${ttlSec}`,
      },
    });

  const error = (message: string, status = 400) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        ...baseHeaders,
        'content-type': 'application/json; charset=utf-8',
      },
    });

  // Uniform OPTIONS handler
  const preflight = req.method === 'OPTIONS'
    ? new Response(null, { status: 204, headers: baseHeaders })
    : null;

  return { headers: baseHeaders, preflight, json, error };
}

// Legacy function for backward compatibility
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

// Alias used by some functions
export function handleOptions(req: Request) {
  return handlePreflight(req);
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

/**
 * Minimal compatibility wrapper used by several functions.
 * Adds CORS headers and optional status.
 */
export function respondWithCors(body: unknown, status = 200, req?: Request) {
  const headers = req ? buildCorsHeaders(req).headers : defaultCorsHeaders;
  const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
  const contentType = typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8';
  return new Response(responseBody, {
    status,
    headers: { ...headers, 'content-type': contentType },
  });
}


export function respondWithCorsOptions() {
  return new Response(null, { status: 204, headers: defaultCorsHeaders });
}

// Legacy exports for backward compatibility
// Stable default headers object for simple use-sites
export const defaultCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, range-unit, x-requested-with, cache-control',
};

// Backwards-compatible name: many functions import `corsHeaders` as an object
export const corsHeaders = defaultCorsHeaders;

export function corsHeadersFor(req: Request) {
  return buildCorsHeaders(req).headers;
}