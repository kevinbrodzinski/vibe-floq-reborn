import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // 🔧 Service-role client for the DB write
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,  // never expose
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 🔐 User client to verify membership
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const userSb = createClient(supabaseUrl, token!, { global: { headers: { Authorization: `Bearer ${token}` } }});

    const { data: { user } } = await userSb.auth.getUser();
    if (!user) return new Response('Invalid JWT', { status: 401 });

    const { floq_id, body, emoji } = await req.json();

    // confirm they're in the floq
    const { error: partErr } = await userSb
      .from('floq_participants')
      .select('user_id', { count: 'exact', head: true })
      .eq('floq_id', floq_id)
      .eq('user_id', user.id);
    if (partErr) throw new Error('User not in floq');

    // Validate input
    if (!floq_id) {
      throw new Error('Floq ID is required');
    }

    if (!body?.trim() && !emoji?.trim()) {
      throw new Error('Either body or emoji is required');
    }

    // do the INSERT with the service-role key
    const { data: message, error: messageError } = await supabaseAdmin
      .from('floq_messages')
      .insert({
        floq_id,
        sender_id: user.id,
        body: body?.trim() || null,
        emoji: emoji?.trim() || null,
      })
      .select(`
        id,
        floq_id,
        sender_id,
        body,
        emoji,
        created_at,
        profiles!inner (
          display_name,
          avatar_url,
          username
        )
      `)
      .single();

    if (messageError) {
      console.error('Message insert error:', messageError);
      throw new Error('Failed to send message');
    }

    // Format the response
    const formattedMessage = {
      id: message.id,
      floq_id: message.floq_id,
      sender_id: message.sender_id,
      body: message.body || undefined,
      emoji: message.emoji || undefined,
      created_at: message.created_at,
      sender: {
        display_name: message.profiles.display_name,
        avatar_url: message.profiles.avatar_url || undefined,
        username: message.profiles.username || undefined,
      },
    };

    return new Response(
      JSON.stringify({ success: true, message: formattedMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in post-floq-message function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});