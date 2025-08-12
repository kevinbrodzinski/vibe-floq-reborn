export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, range-unit, accept-profile, prefer, x-supabase-api-version, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

/**
 * Helper to return JSON with the shared CORS headers.
 *
 * @param data   – Any serialisable data (will be JSON-stringified)
 * @param status – HTTP status code (defaults to 200)
 */
export const respondWithCors = (data: unknown, status: number = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

export const respondWithCorsOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Content-Length": "0",
    },
  });

export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") {
    return respondWithCorsOptions();
  }
  return undefined; // let the caller continue
}