import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Robust broadcast helper for realtime
async function broadcast(
  supabase: any,
  channelName: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const channel = supabase.channel(channelName);

  await new Promise<void>((res, rej) => {
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') res();
      else if (status === 'CHANNEL_ERROR') rej(new Error('Channel subscription failed'));
    });
  });

  await channel.send({ type: 'broadcast', event, payload });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } 
    });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { afterglow_id } = await req.json();

    if (!afterglow_id) {
      throw new Error('Afterglow ID is required');
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch afterglow data with moments
    const { data: afterglow, error: fetchError } = await supabase
      .from('daily_afterglow')
      .select(`
        *,
        afterglow_moments (
          timestamp,
          moment_type,
          title,
          description,
          metadata
        )
      `)
      .eq('id', afterglow_id)
      .single();

    if (fetchError || !afterglow) {
      throw new Error('Failed to fetch afterglow data');
    }

    // Check if summary already exists
    if (afterglow.ai_summary) {
      return new Response(JSON.stringify({ 
        ai_summary: afterglow.ai_summary,
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare context for AI
    const moments = afterglow.afterglow_moments || [];
    const contextData = {
      date: afterglow.date,
      energy_score: afterglow.energy_score,
      social_intensity: afterglow.social_intensity,
      dominant_vibe: afterglow.dominant_vibe,
      total_venues: afterglow.total_venues,
      total_floqs: afterglow.total_floqs,
      moments_count: moments.length,
      moment_types: moments.map(m => m.moment_type).join(', '),
      existing_summary: afterglow.summary_text
    };

    // Create AI prompt
    const prompt = `Create a one-sentence engaging summary for this day's activities:

Energy Score: ${contextData.energy_score}/100
Social Intensity: ${contextData.social_intensity}/100
Dominant Vibe: ${contextData.dominant_vibe || 'mixed'}
Venues Visited: ${contextData.total_venues}
Floqs Joined: ${contextData.total_floqs}
Moments: ${contextData.moments_count} (${contextData.moment_types})

Write a compelling one-sentence summary that captures the essence of this day in a warm, personalized tone. Focus on the vibe and energy rather than just listing activities. Keep it under 100 characters.`;

    // Call OpenAI API with error guard
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating engaging, warm summaries of daily experiences. Write in a personal, uplifting tone.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`OpenAI: ${response.status} ${errTxt}`);
    }

    const data = await response.json();
    const generatedSummary = data.choices[0]?.message?.content?.trim();

    if (!generatedSummary) {
      throw new Error('Failed to generate summary');
    }

    // Update afterglow with AI summary
    const { error: updateError } = await supabase
      .from('daily_afterglow')
      .update({ 
        ai_summary: generatedSummary,
        ai_summary_generated_at: new Date().toISOString()
      })
      .eq('id', afterglow_id);

    if (updateError) {
      console.error('Failed to save summary:', updateError);
      // Return summary even if saving fails
    }

    // Broadcast summary via realtime with consistent channel naming
    await broadcast(supabase, `progress-${afterglow.user_id}`, 'ai_summary_generated', {
      afterglow_id,
      ai_summary: generatedSummary
    });

    return new Response(JSON.stringify({ 
      ai_summary: generatedSummary,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-afterglow-summary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});