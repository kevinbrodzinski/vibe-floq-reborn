import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// SSE subscription for threshold-crossing vibe updates with echo gating
export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get authentication header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { token, aud, idempotency_echo } = await req.json();
    
    if (!token || !aud) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, aud' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // For subscription, we require idempotency echo for continued streaming
    if (idempotency_echo) {
      // Verify the echo matches a previous jti from epsilon_ledger
      const { data: echoData } = await supabase
        .from('epsilon_ledger')
        .select('jti')
        .eq('profile_id', user.id)
        .eq('jti', idempotency_echo)
        .single();

      if (!echoData) {
        return new Response(
          JSON.stringify({ error: 'Invalid idempotency echo - cannot continue streaming' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const kid = crypto.randomUUID();
        const jti = crypto.randomUUID();
        const idempotency_key = crypto.randomUUID();

        const initialEvent = {
          change: 'threshold_crossing',
          claim: {
            kind: 'band',
            value: 'social-medium', // banded value for subscriptions
          },
          hysteresis_applied: false,
          min_interval_enforced: false,
          kid,
          jti,
          idempotency_key,
        };

        const eventData = `data: ${JSON.stringify(initialEvent)}\n\n`;
        controller.enqueue(new TextEncoder().encode(eventData));

        // Set up periodic updates (simplified)
        const interval = setInterval(() => {
          const kid = crypto.randomUUID();
          const jti = crypto.randomUUID();
          const idempotency_key = crypto.randomUUID();

          const event = {
            change: 'threshold_crossing',
            claim: {
              kind: 'band',
              value: Math.random() > 0.5 ? 'social-high' : 'social-medium',
            },
            hysteresis_applied: true,
            min_interval_enforced: false,
            kid,
            jti,
            idempotency_key,
          };

          const eventData = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(eventData));
        }, 30000); // 30 second intervals

        // Clean up on close
        const cleanup = () => {
          clearInterval(interval);
          controller.close();
        };

        // Set timeout for connection
        setTimeout(cleanup, 300000); // 5 minute timeout
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in vibe-subscribe:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}