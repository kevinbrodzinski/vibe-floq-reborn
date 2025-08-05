
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const InviteSchema = {
  safeParse: (data: any) => {
    if (!data.type || !['internal', 'external'].includes(data.type)) {
      return { success: false, error: { format: () => 'Invalid type' } };
    }
    
    if (data.type === 'internal') {
      if (!data.floq_id || !data.inviter_id || !Array.isArray(data.invitee_ids) || data.invitee_ids.length === 0) {
        return { success: false, error: { format: () => 'Missing required fields for internal invite' } };
      }
    }
    
    if (data.type === 'external') {
      if (!data.plan_id || !data.inviter_id || !Array.isArray(data.emails) || data.emails.length === 0) {
        return { success: false, error: { format: () => 'Missing required fields for external invite' } };
      }
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

    const { type } = input.data;

    if (type === 'internal') {
      const { floq_id, inviter_id, invitee_ids } = input.data;

      const inserts = invitee_ids.map((invitee_id: string) => ({
        floq_id,
        inviter_id,
        invitee_id,
        status: 'pending',
        created_at: new Date().toISOString(),
        id: crypto.randomUUID(),
      }));

      const { error } = await supabase
        .from('floq_invitations')
        .upsert(inserts, { onConflict: 'id' });

      if (error) {
        console.error('Internal invite error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        inserted: inserts.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'external') {
      const { plan_id, inviter_id, emails } = input.data;

      const inserts = emails.map((email: string) => ({
        plan_id,
        inviter_id,
        invitee_email: email,
        status: 'pending',
        invited_at: new Date().toISOString(),
        id: crypto.randomUUID(),
      }));

      const { error } = await supabase
        .from('plan_invitations')
        .upsert(inserts, { onConflict: 'id' });

      if (error) {
        console.error('External invite error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        inserted: inserts.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unhandled type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-invite function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
