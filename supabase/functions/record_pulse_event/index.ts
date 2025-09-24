import { serve }       from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,   // function runs as service-role
);

serve(async (req) => {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from('pulse_events')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: `${e}` }), { status: 400 });
  }
}); 