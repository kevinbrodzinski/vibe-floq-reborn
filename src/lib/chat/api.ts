import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

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

export type Surface = 'dm' | 'floq';
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

export const rpc_markThreadRead = (payload: {
  p_surface: 'dm' | 'floq' | 'plan';
  p_thread_id: string;
  p_profile_id: string;
}) => (supabase as any).rpc('mark_thread_read', payload);

export const getOrCreateThread = async (me: string, friend: string): Promise<string> => {
  if (me === friend) {
    throw new Error('Cannot DM yourself');
  }

  const { data, error } = await supabase.rpc('get_or_create_dm_thread', {
    p_user_a: me,
    p_user_b: friend,
  });

  if (error || !data) {
    if (import.meta.env.MODE === 'development') {
      console.error('[getOrCreateThread] RPC error:', error);
    }
    throw error ?? new Error('No thread ID returned');
  }
  
  if (typeof data !== 'string') {
    throw new Error('Unexpected RPC payload');
  }
  
  return data;
};

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