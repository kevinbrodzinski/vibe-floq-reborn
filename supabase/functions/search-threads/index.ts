import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { getUserId } from '../_shared/getUserId.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ThreadSearchResult {
  thread_id: string;
  friend_profile_id: string;
  friend_display_name: string;
  friend_username: string;
  friend_avatar_url: string;
  last_message_at: string;
  my_unread_count: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const body = await req.text();
    if (!body) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { q } = JSON.parse(body);
    
    if (!q || q.trim().length < 2) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use anon key with proper auth headers to respect RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')!
          }
        }
      }
    );

    // Search DM threads where user is a participant and friend's name matches query
    const { data, error } = await supabase
      .from('direct_threads')
      .select(`
        id,
        member_a,
        member_b,
        member_a_profile_id,
        member_b_profile_id,
        last_message_at,
        unread_a,
        unread_b,
        pa:profiles!direct_threads_member_a_profile_id_fkey(display_name, username, avatar_url),
        pb:profiles!direct_threads_member_b_profile_id_fkey(display_name, username, avatar_url)
      `)
      .or(`member_a.eq.${userId},member_b.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Filter and map results based on search query
    const results: ThreadSearchResult[] = (data || [])
      .map(thread => {
        const isUserA = thread.member_a === userId;
        const friendProfile = isUserA ? 
          (Array.isArray(thread.pb) ? thread.pb[0] : thread.pb) : 
          (Array.isArray(thread.pa) ? thread.pa[0] : thread.pa);
        
        if (!friendProfile) return null;

        const searchText = `${friendProfile.display_name || ''} ${friendProfile.username || ''}`.toLowerCase();
        const query = q.toLowerCase().trim();
        
        // Simple fuzzy search - check if query matches display name or username
        if (!searchText.includes(query)) return null;

        return {
          thread_id: thread.id,
          friend_profile_id: isUserA ? thread.member_b_profile_id : thread.member_a_profile_id,
          friend_display_name: friendProfile.display_name || '',
          friend_username: friendProfile.username || '',
          friend_avatar_url: friendProfile.avatar_url || '',
          last_message_at: thread.last_message_at,
          my_unread_count: isUserA ? thread.unread_a : thread.unread_b
        };
      })
      .filter(Boolean) as ThreadSearchResult[];

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search threads error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});