export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper to return JSON with the shared CORS headers.
 *
 * @param data   – Any serializable data (will be JSON-stringified)
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