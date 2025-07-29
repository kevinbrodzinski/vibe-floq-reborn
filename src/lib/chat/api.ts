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

export const fn_uploadChatMedia = (body: Record<string, unknown>) =>
  supabase.functions.invoke('upload-chat-media', { body });