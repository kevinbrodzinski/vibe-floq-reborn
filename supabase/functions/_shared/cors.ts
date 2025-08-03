export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'private, max-age=0',
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

export const respondWithCorsOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Content-Length": "0",
    },
  });