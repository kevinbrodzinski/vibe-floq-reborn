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
  last_message_content?: string;
  match_type: 'name' | 'username' | 'message';
  match_score: number;
}

// Simple fuzzy search scoring
function calculateMatchScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 80;
  
  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 60;
  
  // Fuzzy match - check if all characters of query appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  if (queryIndex === queryLower.length) {
    return Math.max(20, 40 - (textLower.length - queryLower.length));
  }
  
  return 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const profileId = await getUserId(req); // getUserId returns the profile_id (main user identifier)
    if (!profileId) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Check for auth header early
    const auth = req.headers.get('authorization');
    if (!auth) {
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
            authorization: auth
          }
        }
      }
    );

    const query = q.toLowerCase().trim();

    // Search DM threads where current profile_id is a participant with enhanced data
    // Note: RLS policies filter by member_a/member_b, and profile_id equals auth.users.id
    const { data: threadsData, error: threadsError } = await supabase
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
      .or(`member_a.eq.${profileId},member_b.eq.${profileId}`) // Query by member columns (RLS compatible)
      .order('last_message_at', { ascending: false });

    if (threadsError) {
      console.error('Database error:', threadsError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Get recent messages for content search
    const { data: messagesData, error: messagesError } = await supabase
      .from('direct_messages')
      .select('thread_id, content, created_at')
      .in('thread_id', (threadsData || []).map(t => t.id))
      .order('created_at', { ascending: false })
      .limit(200); // Limit to recent messages for performance

    if (messagesError) {
      console.error('Messages search error:', messagesError);
      // Don't fail the entire request, just skip message content search
    }

    // Build message content lookup
    const messagesByThread = new Map<string, string[]>();
    if (messagesData) {
      messagesData.forEach(msg => {
        if (msg.content) {
          if (!messagesByThread.has(msg.thread_id)) {
            messagesByThread.set(msg.thread_id, []);
          }
          messagesByThread.get(msg.thread_id)!.push(msg.content);
        }
      });
    }

    // Process and score results
    const results: ThreadSearchResult[] = (threadsData || [])
      .map(thread => {
        // Check if current profile_id is member_a or member_b (since profile_id equals auth.users.id)
        const isCurrentProfileMemberA = thread.member_a === profileId;
        const friendProfile = isCurrentProfileMemberA ? thread.pb : thread.pa;
        
        if (!friendProfile) return null;

        const displayName = friendProfile.display_name || '';
        const username = friendProfile.username || '';
        
        // Calculate scores for different match types
        const nameScore = calculateMatchScore(query, displayName);
        const usernameScore = calculateMatchScore(query, username);
        
        // Search in message content
        let messageScore = 0;
        let matchingMessage = '';
        const threadMessages = messagesByThread.get(thread.id) || [];
        
        for (const message of threadMessages.slice(0, 10)) { // Check recent 10 messages
          const score = calculateMatchScore(query, message);
          if (score > messageScore) {
            messageScore = score;
            matchingMessage = message;
          }
        }

        // Determine best match type and score
        let bestScore = Math.max(nameScore, usernameScore, messageScore);
        let matchType: 'name' | 'username' | 'message' = 'name';

        if (usernameScore >= nameScore && usernameScore >= messageScore) {
          matchType = 'username';
          bestScore = usernameScore;
        } else if (messageScore >= nameScore && messageScore >= usernameScore) {
          matchType = 'message';
          bestScore = messageScore;
        }

        // Only return results with meaningful scores
        if (bestScore < 20) return null;

        return {
          thread_id: thread.id,
          friend_profile_id: isCurrentProfileMemberA ? thread.member_b_profile_id : thread.member_a_profile_id,
          friend_display_name: displayName,
          friend_username: username,
          friend_avatar_url: friendProfile.avatar_url || '',
          last_message_at: thread.last_message_at,
          my_unread_count: isCurrentProfileMemberA ? thread.unread_a : thread.unread_b,
          last_message_content: matchType === 'message' ? matchingMessage : undefined,
          match_type: matchType,
          match_score: bestScore
        };
      })
      .filter(Boolean) as ThreadSearchResult[];

    // Sort by match score (highest first), then by last message time
    results.sort((a, b) => {
      if (a.match_score !== b.match_score) {
        return b.match_score - a.match_score;
      }
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    // Limit results
    const limitedResults = results.slice(0, 15);

    return new Response(JSON.stringify(limitedResults), {
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