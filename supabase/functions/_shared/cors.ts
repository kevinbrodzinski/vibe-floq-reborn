export const corsHeaders = {
  // Allow any origin (adjust as needed for production)
  "Access-Control-Allow-Origin": "*",

  // Incoming headers Supabase JS can send—including the automatic “prefer” header
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer",

  // Methods supported by your Edge Functions
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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