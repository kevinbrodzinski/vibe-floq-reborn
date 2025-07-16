import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  SyncPlanChangesRequest, 
  ReorderStopsData, 
  UpdateStopData, 
  PresenceUpdateData 
} from '../_shared/types.ts'

export default serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { plan_id, changes }: SyncPlanChangesRequest = await req.json();

    if (!plan_id || !changes || !changes.type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id, changes.type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[sync-plan-changes] Syncing ${changes.type} for plan ${plan_id}`);

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

    // Verify user has access to this plan
    const { data: planAccess, error: accessError } = await supabase
      .rpc('user_has_plan_access', { p_plan_id: plan_id });

    if (accessError || !planAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this plan' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let result = { success: true, message: '', data: null };

    switch (changes.type) {
      case 'reorder_stops': {
        const { stop_order }: ReorderStopsData = changes.data;
        
        if (!Array.isArray(stop_order)) {
          return new Response(
            JSON.stringify({ error: 'stop_order must be an array of stop IDs' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Update stop order
        const updates = stop_order.map((stop_id, index) => ({
          id: stop_id,
          stop_order: index + 1, // 1-based ordering
        }));

        const { data: updatedStops, error: reorderError } = await supabase
          .from('plan_stops')
          .upsert(updates, { onConflict: 'id' })
          .select();

        if (reorderError) {
          console.error('[sync-plan-changes] Reorder error:', reorderError);
          return new Response(
            JSON.stringify({ error: 'Failed to reorder stops' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        result.message = 'Stops reordered successfully';
        result.data = updatedStops;
        break;
      }

      case 'update_stop': {
        const { stop_id, updates }: UpdateStopData = changes.data;
        
        if (!stop_id || !updates) {
          return new Response(
            JSON.stringify({ error: 'stop_id and updates are required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        const { data: updatedStop, error: updateError } = await supabase
          .from('plan_stops')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', stop_id)
          .eq('plan_id', plan_id) // Ensure stop belongs to this plan
          .select()
          .single();

        if (updateError) {
          console.error('[sync-plan-changes] Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update stop' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        result.message = 'Stop updated successfully';
        result.data = updatedStop;
        break;
      }

      case 'presence_update': {
        const { user_id, cursor_position, editing_field, last_seen }: PresenceUpdateData = changes.data;
        
        // For presence updates, we'll use Supabase realtime broadcasting
        // TODO: In the future, this could broadcast to `plan:<id>` channel for live presence
        // channel.broadcast('presence_update', { user_id, cursor_position, editing_field, last_seen })
        result.message = 'Presence update processed';
        result.data = {
          user_id,
          cursor_position,
          editing_field,
          last_seen: new Date().toISOString(),
          plan_id
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown change type: ${changes.type}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    console.log(`[sync-plan-changes] ${changes.type} completed:`, result.message);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[sync-plan-changes] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});