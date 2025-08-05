
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SettingsSchema = {
  safeParse: (data: any) => {
    const validTargets = ['user', 'floq', 'availability', 'preferences'];
    if (!data.target || !validTargets.includes(data.target)) {
      return { success: false, error: { format: () => 'Invalid target' } };
    }
    
    // Validate required fields based on target
    if (data.target === 'user' && !data.updates) {
      return { success: false, error: { format: () => 'Missing updates for user settings' } };
    }
    if (data.target === 'floq' && (!data.floq_id || !data.updates)) {
      return { success: false, error: { format: () => 'Missing floq_id or updates' } };
    }
    if (data.target === 'availability' && !data.available_until) {
      return { success: false, error: { format: () => 'Missing available_until' } };
    }
    if (data.target === 'preferences' && !data.updates) {
      return { success: false, error: { format: () => 'Missing updates for preferences' } };
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
    // Get user from JWT token
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { target, floq_id, updates, available_until } = input.data;

    switch (target) {
      case 'user': {
        // Update user settings (based on update-user-settings.ts)
        const {
          available_until: userAvailableUntil,
          preferred_welcome_template,
          notification_preferences,
          theme_preferences,
          field_enabled,
          field_ripples,
          field_trails,
          privacy_settings
        } = updates;

        const { error: updateError } = await supabase
          .from('user_settings')
          .upsert({
            profile_id: user.id,
            available_until: userAvailableUntil,
            preferred_welcome_template,
            notification_preferences,
            theme_preferences,
            field_enabled,
            field_ripples,
            field_trails,
            privacy_settings,
            updated_at: new Date().toISOString(),
          });

        if (updateError) {
          console.error('Error updating user settings:', updateError);
          return new Response(JSON.stringify({ 
            error: 'Error updating user settings', 
            details: updateError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'floq': {
        // Update floq settings
        const { error: updateError } = await supabase
          .from('floq_settings')
          .upsert({
            floq_id,
            ...updates,
            updated_at: new Date().toISOString()
          });

        if (updateError) {
          console.error('Error updating floq settings:', updateError);
          return new Response(JSON.stringify({ 
            error: 'Failed to update floq settings', 
            details: updateError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'availability': {
        // Update user availability (based on update-availability.ts)
        const { error: updateError } = await supabase
          .from('user_settings')
          .upsert({
            profile_id: user.id,
            available_until,
            updated_at: new Date().toISOString(),
          });

        if (updateError) {
          console.error('Error updating availability:', updateError);
          return new Response(JSON.stringify({ 
            error: 'Error updating availability', 
            details: updateError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'preferences': {
        // Update user preferences (based on update-user-preferences.ts)
        const {
          preferred_vibe,
          prefer_smart_suggestions,
          feedback_sentiment,
          checkin_streak,
          energy_streak_weeks,
          social_streak_weeks,
          both_streak_weeks,
          vibe_color,
          vibe_strength,
          vibe_detection_enabled,
          favorite_locations,
        } = updates;

        const { error: updateError } = await supabase
          .from('user_preferences')
          .upsert({
            profile_id: user.id,
            preferred_vibe,
            prefer_smart_suggestions,
            feedback_sentiment,
            checkin_streak,
            energy_streak_weeks,
            social_streak_weeks,
            both_streak_weeks,
            vibe_color,
            vibe_strength,
            vibe_detection_enabled,
            favorite_locations,
            updated_at: new Date().toISOString(),
          });

        if (updateError) {
          console.error('Error updating user preferences:', updateError);
          return new Response(JSON.stringify({ 
            error: 'Error updating user preferences', 
            details: updateError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
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
