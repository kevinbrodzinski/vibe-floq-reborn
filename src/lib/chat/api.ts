import { supabase } from '@/integrations/supabase/client';
import { supaFn } from '@/lib/supaFn';

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  metadata: any | null;
  reply_to_id: string | null;
  message_type?: 'text' | 'image' | 'voice' | 'file';
  status?: string;
  created_at: string;
  reactions?: Record<string, string[]>;
}

export type Surface = 'dm' | 'floq' | 'plan';
export const PAGE_SIZE = 40;

export const rpc_sendMessage = (payload: {
  p_surface: 'dm' | 'floq' | 'plan';
  p_thread_id: string;
  p_sender_id: string;
  p_body?: string | null;
  p_reply_to_id?: string | null;
  p_media_meta?: any;
}) => supabase.rpc('send_message', payload);

export const rpc_reactToMsg = (payload: {
  p_message_id: string;
  p_user_id: string;
  p_emoji: string;
}) => supabase.rpc('react_to_message', payload);

/**
 * Enhanced thread creation that handles both old and new schema
 */
export async function getOrCreateThread(profileIdA: string, profileIdB: string): Promise<string> {
  try {
    console.log('[getOrCreateThread] Creating thread between profiles:', { profileIdA, profileIdB });
    
    // Use the correct function name and parameters
    const { data: threadId, error: newError } = await supabase
      .rpc('get_or_create_dm_thread', {
        p_profile_a: profileIdA,
        p_profile_b: profileIdB
      });

    if (!newError && threadId) {
      console.log('[getOrCreateThread] Success with new function:', threadId);
      return threadId;
    }

    console.warn('[getOrCreateThread] New function failed, trying fallback:', newError);

    // Fallback: Try to find existing thread manually using the correct column names
    const { data: existingThread, error: findError } = await supabase
      .from('direct_threads')
      .select('id')
      .or(`and(member_a_profile_id.eq.${profileIdA},member_b_profile_id.eq.${profileIdB}),and(member_a_profile_id.eq.${profileIdB},member_b_profile_id.eq.${profileIdA})`)
      .limit(1)
      .single();

    if (!findError && existingThread) {
      console.log('[getOrCreateThread] Found existing thread:', existingThread.id);
      return existingThread.id;
    }

    // Last resort: Create thread manually (this should fail if they're not friends)
    console.log('[getOrCreateThread] Creating thread manually - this may fail if not friends');
    const { data: newThread, error: createError } = await supabase
      .from('direct_threads')
      .insert({
        member_a: profileIdA < profileIdB ? profileIdA : profileIdB,
        member_b: profileIdA < profileIdB ? profileIdB : profileIdA,
        member_a_profile_id: profileIdA < profileIdB ? profileIdA : profileIdB,
        member_b_profile_id: profileIdA < profileIdB ? profileIdB : profileIdA,
        created_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        unread_a: 0,
        unread_b: 0
      })
      .select('id')
      .single();

    if (createError) {
      throw new Error(`Failed to create thread: ${createError.message}`);
    }

    console.log('[getOrCreateThread] Created new thread:', newThread.id);
    return newThread.id;

  } catch (error) {
    console.error('[getOrCreateThread] All methods failed:', error);
    throw error;
  }
}

/**
 * Enhanced thread read marking that handles both old and new schema
 */
export async function rpc_markThreadRead(threadId: string, surface: Surface = 'dm') {
  try {
    // Get current user profile ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First try the enhanced RPC function
    const { error: rpcError } = await supabase
      .rpc('mark_thread_read_enhanced', {
        p_thread_id: threadId,
        p_profile_id: user.id
      });

    if (!rpcError) {
      console.log('[rpc_markThreadRead] Successfully marked thread as read with enhanced RPC');
      return;
    }

    console.warn('[rpc_markThreadRead] Enhanced RPC failed, trying edge function:', rpcError);

    // Fallback: Try the edge function
    const { data, error: edgeError } = await supaFn('mark-thread-read', {
      surface,
      thread_id: threadId,
      profile_id: user.id
    });

    if (!edgeError) {
      console.log('[rpc_markThreadRead] Successfully marked thread as read with edge function');
      return;
    }

    console.warn('[rpc_markThreadRead] Edge function failed, trying manual update:', edgeError);

    // Last resort: Manual update (requires knowing the thread structure)
    const { data: thread, error: fetchError } = await supabase
      .from('direct_threads')
      .select('member_a_profile_id, member_b_profile_id')
      .eq('id', threadId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch thread: ${fetchError.message}`);
    }

    const isMemberA = thread.member_a_profile_id === user.id;
    const updateData = isMemberA 
      ? { last_read_at_a: new Date().toISOString(), unread_a: 0 }
      : { last_read_at_b: new Date().toISOString(), unread_b: 0 };

    const { error: updateError } = await supabase
      .from('direct_threads')
      .update(updateData)
      .eq('id', threadId);

    if (updateError) {
      throw new Error(`Failed to update thread: ${updateError.message}`);
    }

    console.log('[rpc_markThreadRead] Successfully marked thread as read with manual update');

  } catch (error) {
    console.error('[rpc_markThreadRead] All methods failed:', error);
    throw error;
  }
}

export const fn_uploadChatMedia = async (body: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No auth session");
  
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-chat-media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload media: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return { data, error: null };
};