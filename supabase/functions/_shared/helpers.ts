/**  _shared/helpers.ts
 *  Utilities reused by multiple edge-functions
 *  --------------------------------------------------------------- */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------- CORS & security headers ---------- */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
export const securityHeaders: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

/* Pre-flight handler */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: { 
        ...corsHeaders, 
        "Content-Length": "0" 
      } 
    });
  }
  return null;
}

/* ---------- Auth helper (JWT → user) ---------- */
export async function validateAuth(
  req: Request,
  supabase: ReturnType<typeof createClient>,
) {
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) throw new Error("Missing Authorization header");

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) throw new Error("Invalid JWT");

  return data;
}

/* ---------- Simple in-memory rate limiter (deprecated) ---------- */
const rateMap = new Map<string, { count: number; expires: number }>();
export function checkRateLimit(
  userId: string,
  maxPerMinute: number,
  windowMinutes = 1,
): boolean {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const entry = rateMap.get(userId) ?? { count: 0, expires: now + windowMs };

  if (now > entry.expires) {
    // reset window
    entry.count = 0;
    entry.expires = now + windowMs;
  }
  entry.count += 1;
  rateMap.set(userId, entry);

  return entry.count <= maxPerMinute;
}

/* ---------- Enhanced database-backed rate limiter ---------- */
export async function checkRateLimitV2(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  actionType: string,
  targetProfileId?: string
): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit_v2', {
      p_profile_id: profileId,
      p_action_type: actionType,
      p_target_profile_id: targetProfileId || null
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fallback to allowing the request if rate limit check fails
      return { allowed: true };
    }

    return { 
      allowed: data?.success === true,
      error: data?.error || undefined
    };
  } catch (err) {
    console.error('Rate limit check exception:', err);
    // Fallback to allowing the request if rate limit check fails
    return { allowed: true };
  }
}

/* ---------- JSON payload helper ---------- */
export function validatePayload(
  payload: Record<string, unknown>,
  required: string[],
) {
  for (const key of required) {
    if (!(key in payload)) throw new Error(`Missing field «${key}»`);
  }
  return payload as any;
}

/* ---------- Error helper ---------- */
export function createErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}