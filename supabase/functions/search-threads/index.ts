import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { getUserId } from '../_shared/getUserId.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range-unit',
}

interface ThreadSearchResult {
  thread_id: string;
  friend_profile_id: string;
  friend_display_name: string;
  friend_username: string;
  friend_avatar_url: string;
  last_message_at: string;
  my_unread_count: number;
  last_message_content?: string;
  match_type: 'name' | 'username' | 'message';
  match_score: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user ID from auth
    const profileId = await getUserId(req)
    if (!profileId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { query, limit = 20 } = await req.json()
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[search-threads] Searching for: "${query}" (profile_id: ${profileId})`)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Use the enhanced RPC function for thread search
    const { data: searchResults, error: rpcError } = await supabase
      .rpc('search_direct_threads_enhanced', {
        p_profile_id: profileId,
        p_query: query,
        p_limit: limit
      });

    if (rpcError) {
      console.error('[search-threads] RPC error:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Search failed', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[search-threads] Found ${searchResults?.length || 0} results`)

    // Transform results to match expected format
    const transformedResults: ThreadSearchResult[] = (searchResults || []).map(result => ({
      thread_id: result.thread_id,
      friend_profile_id: result.other_profile_id,
      friend_display_name: result.other_display_name || 'Unknown',
      friend_username: result.other_username || 'unknown',
      friend_avatar_url: result.other_avatar_url || '',
      last_message_at: result.last_message_at || new Date().toISOString(),
      my_unread_count: result.unread_count || 0,
      last_message_content: result.last_message_content || '',
      match_type: 'name', // The RPC handles matching logic
      match_score: 80 // Default score since RPC handles relevance
    }));

    return new Response(
      JSON.stringify({ 
        results: transformedResults,
        total: transformedResults.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[search-threads] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})