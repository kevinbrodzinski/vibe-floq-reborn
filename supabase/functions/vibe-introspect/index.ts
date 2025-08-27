import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// PPID token introspection with privacy budgets and idempotency echo
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

    const { token, aud } = await req.json();
    
    if (!token || !aud) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, aud' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check consent for this relying party
    const { data: consentData } = await supabase
      .from('consent_ledger')
      .select('*')
      .eq('profile_id', user.id)
      .eq('aud', aud)
      .is('revoked_at', null)
      .single();

    if (!consentData) {
      return new Response(
        JSON.stringify({ error: 'No valid consent found for this relying party' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check frequency caps
    const today = new Date().toISOString().split('T')[0];
    const { data: frequencyData } = await supabase
      .from('frequency_caps')
      .select('*')
      .eq('profile_id', user.id)
      .eq('partner_id', aud)
      .eq('reset_at', today)
      .single();

    const budget_remaining = frequencyData 
      ? Math.max(0, frequencyData.cap_per_day - frequencyData.used_today)
      : 100; // default cap

    if (budget_remaining <= 0) {
      // Budget exhausted - return coarsened response
      const kid = crypto.randomUUID();
      const jti = crypto.randomUUID();
      const idempotency_key = crypto.randomUUID();

      return new Response(
        JSON.stringify({
          claim: {
            kind: 'band',
            value: 'medium', // coarsened generic band
            // no confidence when budget exhausted
          },
          budget_remaining: 0,
          min_interval_enforced: false,
          hysteresis_applied: false,
          kid,
          jti,
          idempotency_key,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Simulate introspection of PPID token (simplified for now)
    // In production, this would verify the token signature and extract claims
    const kid = crypto.randomUUID();
    const jti = crypto.randomUUID();
    const idempotency_key = crypto.randomUUID();

    // Update frequency counter
    if (frequencyData) {
      await supabase
        .from('frequency_caps')
        .update({ used_today: frequencyData.used_today + 1 })
        .eq('id', frequencyData.id);
    } else {
      await supabase
        .from('frequency_caps')
        .insert({
          profile_id: user.id,
          partner_id: aud,
          used_today: 1,
          reset_at: today,
        });
    }

    // Record epsilon spending
    await supabase
      .from('epsilon_ledger')
      .insert({
        profile_id: user.id,
        event_type: 'introspect',
        epsilon_spent: 0.1, // small amount for introspection
        kid,
        jti,
        entry_hash: crypto.randomUUID(), // simplified hash
      });

    // Return introspection response
    return new Response(
      JSON.stringify({
        claim: {
          kind: 'raw',
          value: 'social', // example vibe claim
          confidence: 0.85,
        },
        budget_remaining: budget_remaining - 1,
        min_interval_enforced: false,
        hysteresis_applied: false,
        kid,
        jti,
        idempotency_key,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in vibe-introspect:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}