const DEFAULT_ALLOWED = [
  /\.sandbox\.lovable\.dev$/i,
  /\.sandbox\.lovable\.app$/i,   // some workspaces use .app
  /localhost(:\d+)?$/i,
];

export function allowedOrigin(origin: string | null): string {
  if (!origin) return '*'; // last resort for previews; OK for OPTIONS
  try {
    const h = new URL(origin).host;
    if (DEFAULT_ALLOWED.some(rx => rx.test(h))) return origin;
  } catch {}
  return '*'; // safe fallback for previews
}

export function corsHeadersFor(req: Request) {
  const origin = req.headers.get('origin');
  const allow = allowedOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

export function handlePreflight(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  }
  return null;
}

// Legacy export for backward compatibility
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};