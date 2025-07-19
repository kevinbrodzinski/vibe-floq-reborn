
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const InviteSchema = {
  safeParse: (data: any) => {
    const validTypes = ['floq', 'external'];
    if (!data.type || !validTypes.includes(data.type)) {
      return { success: false, error: { format: () => 'Invalid type' } };
    }
    if (!data.user_id || !data.target_id) {
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
    const input = InviteSchema.safeParse(body);

    if (!input.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payload', 
        details: input.error.format() 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, user_id, target_id, message } = input.data;

    switch (type) {
      case 'floq': {
        // Internal floq invitation logic
        const floq_id = target_id;

        // Verify user can invite to this floq
        const { data: participation, error: participationError } = await supabase
          .from('floq_participants')
          .select('role')
          .eq('floq_id', floq_id)
          .eq('user_id', user_id)
          .single();

        if (participationError || !participation) {
          return new Response(JSON.stringify({ error: 'User not authorized to invite to this floq' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create invitation record
        const { data: invitation, error: inviteError } = await supabase
          .from('floq_invitations')
          .insert({
            floq_id,
            inviter_id: user_id,
            invitee_id: body.invitee_id,
            status: 'pending'
          })
          .select()
          .single();

        if (inviteError) {
          return new Response(JSON.stringify({ error: 'Failed to create invitation' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          invitation_id: invitation.id,
          message: 'Floq invitation sent successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'external': {
        // External email invitation logic
        const email = target_id;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return new Response(JSON.stringify({ error: 'Invalid email address' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create external invitation record
        const { data: invitation, error: inviteError } = await supabase
          .from('external_invitations')
          .insert({
            inviter_id: user_id,
            email,
            message: message || 'Join me on Floq!',
            status: 'sent'
          })
          .select()
          .single();

        if (inviteError) {
          return new Response(JSON.stringify({ error: 'Failed to create external invitation' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Here you would typically send an actual email
        // For now, we'll just log it
        console.log(`External invitation sent to ${email} from user ${user_id}`);

        return new Response(JSON.stringify({ 
          success: true, 
          invitation_id: invitation.id,
          message: 'External invitation sent successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unhandled invitation type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in send-invite function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
