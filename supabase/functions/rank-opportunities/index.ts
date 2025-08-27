import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Multi-objective ranking with uplift pacing and budget/frequency controls
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

    const { candidates, context } = await req.json();
    
    if (!candidates || !Array.isArray(candidates)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid candidates array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check frequency caps for ranking requests
    const today = new Date().toISOString().split('T')[0];
    const { data: frequencyData } = await supabase
      .from('frequency_caps')
      .select('*')
      .eq('profile_id', user.id)
      .eq('partner_id', 'ranking')
      .eq('reset_at', today)
      .single();

    const budget_remaining = frequencyData 
      ? Math.max(0, frequencyData.cap_per_day - frequencyData.used_today)
      : 50; // lower default cap for ranking

    let frequency_cap_state: 'ok' | 'limited' | 'exhausted' = 'ok';
    
    if (budget_remaining <= 0) {
      frequency_cap_state = 'exhausted';
    } else if (budget_remaining <= 5) {
      frequency_cap_state = 'limited';
    }

    // Simple multi-objective scoring (simplified for now)
    const scoredCandidates = candidates.map((candidate: any) => {
      // Multi-objective utility: vibe-match + logistics + group-fit + cost/novelty
      const vibeScore = Math.random() * 0.4; // 40% weight
      const logisticsScore = Math.random() * 0.3; // 30% weight  
      const groupFitScore = Math.random() * 0.2; // 20% weight
      const noveltyScore = Math.random() * 0.1; // 10% weight
      
      const totalScore = vibeScore + logisticsScore + groupFitScore + noveltyScore;
      
      return {
        id: candidate.id || crypto.randomUUID(),
        score: Math.round(totalScore * 100) / 100,
        meta: candidate,
      };
    }).sort((a, b) => b.score - a.score);

    // Create topK hash for tracking
    const topK_hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(scoredCandidates.slice(0, 10).map(c => c.id).join(','))
    ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16));

    // Log exposure for uplift tracking
    await supabase
      .from('epsilon_ledger')
      .insert({
        profile_id: user.id,
        event_type: 'rank',
        epsilon_spent: 0.05, // small amount for ranking
        metadata: {
          topK_hash,
          candidate_count: candidates.length,
          context: context || {},
        },
        kid: crypto.randomUUID(),
        jti: crypto.randomUUID(),
        entry_hash: crypto.randomUUID(),
      });

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
          partner_id: 'ranking',
          used_today: 1,
          reset_at: today,
        });
    }

    // Return ranked response with pacing metadata
    return new Response(
      JSON.stringify({
        items: scoredCandidates,
        topK_hash,
        budget_remaining: budget_remaining - 1,
        frequency_cap_state,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in rank-opportunities:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}