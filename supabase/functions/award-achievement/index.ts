import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting store (in-memory for now, could be Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 50; // 50 requests per minute per user

// Request validation patterns
const VALID_ACHIEVEMENT_CODES = ['first_friend', 'explorer', 'social_vibe_master'];
const MAX_INCREMENT_VALUE = 7200; // 2 hours in seconds (max reasonable increment)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardRequest {
  code: string;
  increment: number;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const userId = user.id;
    const now = Date.now();
    const userLimit = rateLimitStore.get(userId);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
          console.warn(`Rate limit exceeded for user ${userId}`);
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        userLimit.count++;
      } else {
        // Reset window
        userLimit.count = 1;
        userLimit.resetTime = now + RATE_LIMIT_WINDOW;
      }
    } else {
      rateLimitStore.set(userId, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    }

    // Parse and validate request body
    const body = await req.json() as AwardRequest;
    
    // Input validation
    if (!body.code || !VALID_ACHIEVEMENT_CODES.includes(body.code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid achievement code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body.increment !== 'number' || body.increment <= 0 || body.increment > MAX_INCREMENT_VALUE) {
      return new Response(
        JSON.stringify({ error: 'Invalid increment value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security check: Prevent obvious script injection attempts
    const stringifyBody = JSON.stringify(body);
    if (stringifyBody.includes('<script') || stringifyBody.includes('javascript:') || stringifyBody.includes('onload=')) {
      console.warn(`Potential script injection attempt from user ${userId}:`, body);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the database function
    const { data: wasEarned, error: dbError } = await supabase.rpc('award_if_goal_met', {
      _user: userId,
      _code: body.code,
      _increment: body.increment,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseTime = Date.now() - startTime;
    
    // Log achievement events for analytics
    console.log(JSON.stringify({
      event: 'achievement_processed',
      user_id: userId,
      achievement_code: body.code,
      increment: body.increment,
      was_earned: wasEarned,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString()
    }));

    return new Response(
      JSON.stringify({ 
        success: true,
        achievement_earned: wasEarned,
        response_time_ms: responseTime
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});