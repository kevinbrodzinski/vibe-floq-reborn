import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

interface GeneratePlanRecapRequest {
  planId: string;
}

interface PlanDetails {
  id: string;
  title: string;
  description?: string;
  vibe_tag?: string;
  planned_at: string;
  creator_id: string;
  plan_stops: Array<{
    title: string;
    description?: string;
    start_time?: string;
    venue?: {
      name: string;
      venue_type?: string;
    };
  }>;
  plan_participants: Array<{
    user_id: string;
    profiles?: {
      display_name?: string;
      username?: string;
    };
  }>;
}

const openAIApiKey = Deno.env.get('OPENAI_KEY');

serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { planId }: GeneratePlanRecapRequest = await req.json();

    if (!planId) {
      return new Response(
        JSON.stringify({ error: 'Missing planId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[generate-plan-recap] Processing plan ${planId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch plan details with stops and participants
    const { data: plan, error: planError } = await supabase
      .from('floq_plans')
      .select(`
        *,
        plan_stops (*,
          venues (name, venue_type)
        ),
        plan_participants (*,
          profiles (display_name, username)
        )
      `)
      .eq('id', planId)
      .single() as { data: PlanDetails | null, error: any };

    if (planError || !plan) {
      console.error('[generate-plan-recap] Plan fetch error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user has access to the plan
    const hasAccess = plan.creator_id === user.id || 
      plan.plan_participants.some(p => p.user_id === user.id);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert or update summary record as pending
    await supabase
      .from('plan_ai_summaries')
      .upsert({
        plan_id: planId,
        status: 'pending',
        updated_at: new Date().toISOString()
      });

    // Build AI prompt
    const stopsText = plan.plan_stops.map(stop => 
      `- ${stop.title}${stop.venue?.name ? ` at ${stop.venue.name}` : ''}${stop.start_time ? ` (${stop.start_time})` : ''}`
    ).join('\n');

    const participantCount = plan.plan_participants.length;
    const vibeText = plan.vibe_tag ? ` with a ${plan.vibe_tag} vibe` : '';

    const prompt = `Create a fun, engaging recap for this completed plan and suggest follow-up activities.

PLAN: "${plan.title}"
${plan.description ? `DESCRIPTION: ${plan.description}` : ''}
DATE: ${new Date(plan.planned_at).toLocaleDateString()}
PARTICIPANTS: ${participantCount} people${vibeText}

STOPS:
${stopsText || 'No specific stops planned'}

Generate a response with:
1. A markdown recap (2-3 sentences) highlighting what made this plan special
2. 3-4 JSON suggestions for follow-up activities

Format your response EXACTLY like this:

## Recap
[Your engaging recap here in markdown]

## Suggestions
[
  {
    "title": "Grab Brunch After",
    "body": "Keep the good vibes going with a relaxed brunch nearby",
    "emoji": "🥐"
  },
  {
    "title": "Book a Rideshare",
    "body": "Share a ride home and continue the conversation",
    "emoji": "🚗"
  },
  {
    "title": "Plan Next Adventure",
    "body": "Start planning your next group activity while the energy is high",
    "emoji": "🗓️"
  }
]`;

    // Call OpenAI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 29000); // 29s timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful assistant that creates engaging recaps and suggestions for social plans. Always follow the exact format requested.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.choices[0]?.message?.content;

      if (!generatedText) {
        throw new Error('No content generated from OpenAI');
      }

      // Parse the response
      const parts = generatedText.split('## Suggestions');
      if (parts.length !== 2) {
        throw new Error('Invalid response format from OpenAI');
      }

      const recapMarkdown = parts[0].replace('## Recap', '').trim();
      let suggestions = [];

      try {
        const suggestionsText = parts[1].trim();
        suggestions = JSON.parse(suggestionsText);
      } catch (e) {
        console.warn('[generate-plan-recap] Failed to parse suggestions, using defaults');
        suggestions = [
          {
            title: "Share the Memories",
            body: "Post photos and highlights from your amazing time together",
            emoji: "📸"
          },
          {
            title: "Plan the Next One",
            body: "Start planning your next group adventure while the energy is high",
            emoji: "🗓️"
          }
        ];
      }

      // Update the summary record
      const { error: updateError } = await supabase
        .from('plan_ai_summaries')
        .update({
          summary_md: recapMarkdown,
          suggestions: suggestions,
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('plan_id', planId);

      if (updateError) {
        throw new Error(`Failed to save summary: ${updateError.message}`);
      }

      console.log(`[generate-plan-recap] Successfully generated recap for plan ${planId}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          summary_md: recapMarkdown,
          suggestions: suggestions
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Failed to generate recap';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Update summary record with error
      await supabase
        .from('plan_ai_summaries')
        .update({
          status: 'error',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('plan_id', planId);

      throw error;
    }

  } catch (error) {
    console.error('[generate-plan-recap] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});