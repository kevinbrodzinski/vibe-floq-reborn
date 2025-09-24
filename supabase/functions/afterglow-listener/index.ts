import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    console.log('Afterglow listener starting...')
    
    // Subscribe to afterglow refresh notifications
    const channel = supabase.channel('afterglow-refresh')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_afterglow',
          filter: 'is_stale=eq.true'
        },
        async (payload) => {
          console.log('Stale afterglow detected:', payload)
          
          if (payload.new && payload.new.user_id) {
            const userId = payload.new.user_id
            const date = payload.new.date || new Date().toISOString().slice(0, 10)
            
            console.log(`Regenerating afterglow for user ${userId} on ${date}`)
            
            // Call the afterglow generation function
            const { data, error } = await supabase.functions.invoke('generate-daily-afterglow', {
              body: { 
                user_id: userId, 
                date: date,
                force_regenerate: true 
              }
            })
            
            if (error) {
              console.error('Failed to regenerate afterglow:', error)
            } else {
              console.log('Afterglow regenerated successfully:', data)
            }
          }
        }
      )
      .subscribe()

    // Also listen for pg_notify signals
    supabase.channel('afterglow-notify')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'task_queue',
        filter: 'task=eq.generate_afterglow'
      }, async (payload) => {
        console.log('Task queue afterglow generation:', payload)
        
        if (payload.new && payload.new.payload) {
          const { user_id, date } = payload.new.payload
          
          // Call the generation function
          const { data, error } = await supabase.functions.invoke('generate-daily-afterglow', {
            body: { user_id, date }
          })
          
          if (!error) {
            // Mark task as processed
            await supabase
              .from('task_queue')
              .update({ 
                status: 'completed', 
                processed_at: new Date().toISOString() 
              })
              .eq('id', payload.new.id)
          }
        }
      })
      .subscribe()

    console.log('Afterglow listener channels subscribed')

    // Keep the function alive
    return new Response(
      JSON.stringify({ 
        message: 'Afterglow listener active',
        channels: ['afterglow-refresh', 'afterglow-notify']
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Afterglow listener error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
