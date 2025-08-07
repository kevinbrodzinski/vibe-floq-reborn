
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions for consistent responses
const ok = (data: any) => new Response(JSON.stringify(data), { 
  status: 200, 
  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
});

const fail = (code: number, msg: string) => new Response(JSON.stringify({ error: msg }), { 
  status: code, 
  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
});

const InputSchema = {
  safeParse: (data: any) => {
    const validModes = ['afterglow', 'daily', 'floq-match', 'plan', 'weekly', 'shared-activity-suggestions', 'afterglow-summary'];
    if (!data.mode || !validModes.includes(data.mode)) {
      return { success: false, error: { format: () => 'Invalid mode' } };
    }
    return { success: true, data };
  }
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
      status: 204,
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } 
    });
  }

  try {
    const body = await req.json();
    const input = InputSchema.safeParse(body);

    if (!input.success) {
      return fail(400, `Invalid mode. Expected one of: afterglow, afterglow-summary, daily, weekly, plan, floq-match, shared-activity-suggestions`);
    }

    const { mode, user_id, plan_id, floq_id, date, afterglow_id, prompt, temperature, max_tokens } = input.data;

    switch (mode) {
      case 'afterglow':
      case 'afterglow-summary': {
        // Generate afterglow summary logic
        if (!openAIApiKey) {
          return fail(500, 'OpenAI API key not configured');
        }

        if (!afterglow_id) {
          return fail(400, 'Afterglow ID is required for afterglow mode');
        }

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
          return fail(500, 'Failed to fetch afterglow data');
        }

        // Check if summary already exists
        if (afterglow.ai_summary) {
          return ok({ 
            ai_summary: afterglow.ai_summary,
            cached: true 
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
        const choice = data.choices?.[0]?.message?.content?.trim();
        
        if (!choice) {
          throw new Error('OpenAI returned no text');
        }
        
        const generatedSummary = choice;

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
        }

        // Broadcast summary via realtime
        await broadcast(supabase, `progress-${afterglow.user_id}`, 'ai_summary_generated', {
          afterglow_id,
          ai_summary: generatedSummary
        });

        return ok({ 
          ai_summary: generatedSummary,
          cached: false 
        });
      }

      case 'plan': {
        // Generate plan summary logic
        if (!plan_id) {
          return fail(400, 'Missing plan_id parameter for plan mode');
        }

        const planMode = body.plan_mode || 'finalized';

        if (!['finalized', 'afterglow'].includes(planMode)) {
          return fail(400, 'Invalid plan_mode. Must be "finalized" or "afterglow"');
        }

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
          console.error('Plan fetch error:', planError);
          return new Response(JSON.stringify({ error: 'Plan not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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

        const prompt = planMode === 'finalized' 
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
            console.error('OpenAI API error:', await openAIResponse.text());
            return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const aiData = await openAIResponse.json();
          summary = aiData.choices?.[0]?.message?.content?.trim();

          if (!summary) {
            return new Response(JSON.stringify({ error: 'No summary generated' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            return new Response(JSON.stringify({ error: 'Request timeout - please try again' }), {
              status: 408,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw fetchError;
        }

        // Store summary in plan_summaries table
        const { error: insertError } = await supabase
          .from('plan_summaries')
          .upsert({
            plan_id,
            mode: planMode as 'finalized' | 'afterglow',
            summary,
            generated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(JSON.stringify({ error: 'Failed to save summary' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          summary,
          plan_id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'daily': {
        // Generate daily afterglow logic
        if (!user_id || !date) {
          return new Response(JSON.stringify({ error: 'Missing user_id or date' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const { data, error } = await supabase.rpc('generate_daily_afterglow_sql', {
            p_user_id: user_id,
            p_date: date,
          });

          if (error) {
            // If the database function doesn't exist, create a fallback response
            if (error.message.includes('Could not find the function')) {
              console.log('Database function not found, returning fallback response');
              
              return new Response(JSON.stringify({
                success: true,
                afterglow_id: null,
                venue_count: 0,
                message: 'Fallback response (database function not deployed)'
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (rpcError) {
          console.error('RPC call failed:', rpcError);
          return new Response(JSON.stringify({ error: 'Database function call failed' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'weekly': {
        // Generate weekly AI suggestion logic
        if (!user_id) {
          return new Response(JSON.stringify({ error: 'Missing user_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase.rpc('call_weekly_ai_suggestion', {
          p_user_id: user_id,
        });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'floq-match': {
        // Generate floq auto match logic
        if (!user_id) {
          return new Response(JSON.stringify({ error: 'Missing user_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase.rpc('generate_floq_auto_match', {
          p_user_id: user_id,
        });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'shared-activity-suggestions': {
        // Generate shared activity suggestions
        if (!openAIApiKey) {
          return fail(500, 'OpenAI API key not configured');
        }

        // Use the destructured values from input.data with defaults
        const promptValue = prompt;
        const temperatureValue = temperature || 0.7;
        const maxTokensValue = max_tokens || 400;
        
        if (!promptValue) {
          return fail(400, 'Missing prompt parameter for shared-activity-suggestions mode');
        }

        // Call OpenAI API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { 
                  role: 'system', 
                  content: 'You are Floq\'s social-match engine. Generate activity suggestions as valid JSON arrays only. No markdown, no explanations, just pure JSON.' 
                },
                { role: 'user', content: promptValue }
              ],
              temperature: temperatureValue,
              max_tokens: maxTokensValue,
            }),
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errTxt = await response.text();
            return fail(500, `OpenAI API error: ${response.status} ${errTxt}`);
          }

          const data = await response.json();
          const choice = data.choices?.[0]?.message?.content?.trim();
          
          if (!choice) {
            return fail(500, 'OpenAI returned no content');
          }
          
          // Try to parse the JSON to validate it, then return the parsed result
          try {
            const parsed = JSON.parse(choice); // Validate and parse JSON
            return ok(parsed); // Return the parsed JSON object
          } catch (parseError) {
            // If it's not valid JSON, return an error
                         return fail(500, `OpenAI returned invalid JSON: ${choice.substring(0, 100)}...`);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            return fail(408, 'Request timeout - please try again');
          }
          return fail(500, `OpenAI request failed: ${fetchError.message}`);
        }
      }

      default:
        return fail(400, `Unhandled mode: ${mode}`);
    }

  } catch (error) {
    console.error('Error in generate-intelligence function:', error);
    return fail(500, error.message || 'Internal server error');
  }
});
