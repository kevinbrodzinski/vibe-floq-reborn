import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PlanSummarySchema, parseJson } from '../_shared/zod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { 
    status, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonRes(405, { error: 'Method not allowed' });

  try {
    // Auth check
    const auth = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: auth ? { Authorization: auth } : {} } }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonRes(401, { error: 'Unauthorized' });

    // Validate request
    const json = await req.json().catch(() => null);
    const parsed = parseJson(PlanSummarySchema, json);
    if (parsed.error) return parsed.error;
    
    const { plan_id, mode } = parsed.data;

    // Fetch plan with stops and participants
    const { data: plan, error: planError } = await supabase
      .from('floq_plans')
      .select(`
        id,
        title,
        description,
        planned_at,
        vibe_tags,
        plan_stops (
          title,
          description,
          start_time,
          end_time,
          stop_order
        ),
        plan_participants (
          profiles:user_id (
            display_name,
            username
          )
        )
      `)
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('[plan-summary] Plan fetch error:', planError);
      return jsonRes(404, { error: 'Plan not found' });
    }

    const participantCount = plan.plan_participants?.length || 0;
    const stopCount = plan.plan_stops?.length || 0;
    const topVibe = plan.vibe_tags?.[0] || 'good vibes';
    const planTitle = plan.title || 'Untitled Plan';
    
    const stops = plan.plan_stops?.map(s => s.title).join(', ') || 'various locations';
    const participantNames = plan.plan_participants
      ?.map(p => p.profiles?.display_name || p.profiles?.username)
      .filter(Boolean)
      .join(', ') || 'the group';

    const prompt = mode === 'finalized' 
      ? `Write a fun, engaging 2-3 sentence summary for a group plan called "${planTitle}". 

Details:
- ${participantCount} participants: ${participantNames}
- ${stopCount} stops: ${stops}
- Vibe: ${topVibe}
- Date: ${plan.planned_at}

Make it sound exciting and capture the energy they'll have together. Focus on what they're planning to do.`
      : `Write a nostalgic, warm 2-3 sentence summary reflecting on a completed group experience called "${planTitle}". 

Details:
- ${participantCount} participants: ${participantNames}
- ${stopCount} stops visited: ${stops}
- Vibe: ${topVibe}
- Date: ${plan.planned_at}

Capture the afterglow feeling - the memories made, connections formed, and moments shared. Use past tense and focus on what they experienced together.`;

    // Add 10s timeout for OpenAI request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let summary;
    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a friendly social planning assistant. Write engaging, concise summaries that capture the excitement of group plans.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 150
        }),
      });

      clearTimeout(timeoutId);

      if (!openAIResponse.ok) {
        console.error('[plan-summary] OpenAI API error:', await openAIResponse.text());
        return jsonRes(500, { error: 'Failed to generate summary' });
      }

      const aiData = await openAIResponse.json();
      summary = aiData.choices?.[0]?.message?.content?.trim();

      if (!summary) return jsonRes(500, { error: 'No summary generated' });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return jsonRes(408, { error: 'Request timeout - please try again' });
      }
      throw fetchError;
    }

    // Store summary in plan_summaries table
    const { error: insertError } = await supabase
      .from('plan_summaries')
      .upsert({
        plan_id,
        mode: mode as 'finalized' | 'afterglow',
        summary,
        generated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[plan-summary] Insert error:', insertError);
      return jsonRes(500, { error: 'Failed to save summary' });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      plan_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[plan-summary]', error);
    return jsonRes(500, { error: error.message });
  }
});