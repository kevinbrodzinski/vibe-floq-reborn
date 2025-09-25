import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! }
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { floq_id, message_text, confidence = 0.8 } = await req.json();
    
    if (!floq_id || !message_text) {
      throw new Error("Missing required fields: floq_id, message_text");
    }

    // Verify user is in the floq
    const { data: membership } = await supabase
      .from("floq_participants")
      .select("profile_id")
      .eq("floq_id", floq_id)
      .eq("profile_id", user.id)
      .single();

    if (!membership) {
      throw new Error("User is not a member of this floq");
    }

    // Simple intent detection - look for question patterns
    const questionPatterns = [
      /who'?s (down|in|up) for/i,
      /anyone (want|interested|up for)/i,
      /should we/i,
      /what about/i,
      /how about/i,
      /who wants to/i
    ];

    const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(message_text));
    
    if (!hasQuestionPattern) {
      // Not a poll-worthy message
      return new Response(
        JSON.stringify({ ok: true, created: false, reason: "No poll intent detected" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract the activity/venue from the message
    let title = "Quick poll";
    let options = ["Yes", "No"];

    // Try to extract what they're asking about
    const activityMatch = message_text.match(/for (.+?)[\?\.!]?$/i);
    if (activityMatch) {
      title = `${activityMatch[1]}?`;
      options = ["I'm in!", "Maybe", "Can't make it"];
    }

    // Create wings poll card
    const { data: wingsCard, error: cardError } = await supabase
      .from("floq_wings_events")
      .insert({
        floq_id,
        kind: 'poll',
        payload: {
          title,
          options,
          source_message: message_text,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        },
        created_by: user.id,
        confidence,
        status: 'active'
      })
      .select()
      .single();

    if (cardError) {
      console.error("Error creating wings poll:", cardError);
      throw cardError;
    }

    console.log(`Wings poll created for floq ${floq_id}: "${title}"`);

    // Broadcast to the floq stream channel to trigger real-time updates
    const { error: channelError } = await supabase
      .channel(`floq:${floq_id}:stream`)
      .send({
        type: 'broadcast',
        event: 'stream',
        payload: { type: 'wings_poll_created', poll_id: wingsCard.id }
      });

    if (channelError) {
      console.error("Error broadcasting to channel:", channelError);
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        created: true, 
        poll: wingsCard,
        detected_intent: { title, options }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wings-create-poll:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});