
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SettingsSchema = {
  safeParse: (data: any) => {
    const validTargets = ['user', 'floq', 'availability'];
    if (!data.target || !validTargets.includes(data.target)) {
      return { success: false, error: { format: () => 'Invalid target' } };
    }
    
    // Validate required fields based on target
    if (data.target === 'user' && (!data.user_id || !data.updates)) {
      return { success: false, error: { format: () => 'Missing user_id or updates' } };
    }
    if (data.target === 'floq' && (!data.floq_id || !data.updates)) {
      return { success: false, error: { format: () => 'Missing floq_id or updates' } };
    }
    if (data.target === 'availability' && (!data.user_id || !data.available_until)) {
      return { success: false, error: { format: () => 'Missing user_id or available_until' } };
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
    const input = SettingsSchema.safeParse(body);

    if (!input.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payload', 
        details: input.error.format() 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { target, user_id, floq_id, updates, available_until } = input.data;

    switch (target) {
      case 'user': {
        // Update user settings
        const { data: updatedSettings, error: updateError } = await supabase
          .from('user_settings')
          .upsert({
            user_id,
            ...updates,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Failed to update user settings' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          settings: updatedSettings,
          message: 'User settings updated successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'floq': {
        // Update floq settings
        const { data: updatedSettings, error: updateError } = await supabase
          .from('floq_settings')
          .upsert({
            floq_id,
            ...updates,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Failed to update floq settings' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          settings: updatedSettings,
          message: 'Floq settings updated successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'availability': {
        // Update user availability
        const { data: updatedAvailability, error: updateError } = await supabase
          .from('user_availability')
          .upsert({
            user_id,
            available_until,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Failed to update availability' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          availability: updatedAvailability,
          message: 'Availability updated successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unhandled settings target' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in update-settings function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
