
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FloqInteractionSchema = {
  safeParse: (data: any) => {
    const validActions = ['boost', 'mention'];
    if (!data.action || !validActions.includes(data.action)) {
      return { success: false, error: { format: () => 'Invalid action' } };
    }
    if (!data.floq_id || !data.user_id) {
      return { success: false, error: { format: () => 'Missing required fields' } };
    }
    return { success: true, data };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const input = FloqInteractionSchema.safeParse(body);

    if (!input.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payload', 
        details: input.error.format() 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, floq_id, user_id, message_content, message_id } = input.data;

    switch (action) {
      case 'boost': {
        // Handle boost logic with atomic upsert to prevent race conditions
        const { data: boost, error: boostError } = await supabase
          .from('floq_boosts')
          .upsert({
            floq_id,
            user_id,
            boost_type: 'vibe',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
          }, {
            onConflict: 'floq_id,user_id,boost_type',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (boostError) {
          // Check if it's a duplicate boost error
          if (boostError.code === '23505' || boostError.message.includes('duplicate')) {
            return new Response(JSON.stringify({ 
              success: false, 
              message: 'User has already boosted this floq recently' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          console.error('Boost creation error:', boostError);
          return new Response(JSON.stringify({ error: 'Failed to create boost' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          boost_id: boost.id,
          message: 'Floq boosted successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'mention': {
        // Handle mention logic
        if (!message_content || !message_id) {
          return new Response(JSON.stringify({ error: 'Message content and ID required for mentions' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if message contains @floq mention (case-insensitive, word boundaries)
        if (!/\b@floq\b/i.test(message_content)) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'No @floq mention found in message' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check cooldown (10 minutes)
        const { data: cooldown, error: cooldownError } = await supabase
          .from('floq_mention_cooldown')
          .select('last_mention_at')
          .eq('floq_id', floq_id)
          .eq('user_id', user_id)
          .maybeSingle();

        if (cooldownError) {
          console.error('Cooldown check error:', cooldownError);
        }

        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        if (cooldown && new Date(cooldown.last_mention_at) > tenMinutesAgo) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Cooldown active - please wait before mentioning @floq again' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update or insert cooldown record
        const { error: cooldownUpdateError } = await supabase
          .from('floq_mention_cooldown')
          .upsert({
            floq_id,
            user_id,
            last_mention_at: now.toISOString()
          });

        if (cooldownUpdateError) {
          console.error('Failed to update cooldown:', cooldownUpdateError);
        }

        // Process the mention (placeholder for AI processing)
        console.log(`@floq mention processed for floq ${floq_id} by user ${user_id}`);
        console.log(`Message content: ${message_content.substring(0, 100)}...`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: '@floq mention processed successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unhandled interaction action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in floq-interactions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
