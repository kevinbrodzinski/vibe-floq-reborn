import { supabase } from '@/integrations/supabase/client';
import type { RallyId } from '@/types/rally';

export type RallyInboxItem = {
  rally_id: RallyId;
  created_at: string;
  expires_at: string;
  center_lng: number;
  center_lat: number;
  venue_id?: string | null;
  note?: string | null;
  creator_id: string;
  creator_name?: string | null;
  creator_avatar?: string | null;
  invite_status: 'pending' | 'joined' | 'declined';
  responded_at?: string | null;
  joined_count: number;
  unread_count?: number;
  first_unread_at?: string | null;
  last_message_at?: string | null;
  last_message_excerpt?: string | null;
};

export async function listRallyInbox(): Promise<RallyInboxItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_rally_inbox');
    if (error) throw error;
    return (data ?? []) as RallyInboxItem[];
  } catch {
    const { data, error: legacyError } = await supabase.rpc('rally_inbox_secure');
    if (legacyError) throw legacyError;
    return (data ?? []) as RallyInboxItem[];
  }
}

export async function respondInvite(rallyId: RallyId, status: 'joined' | 'declined' = 'joined') {
  const { data, error } = await supabase.functions.invoke('join-rally', {
    body: { rallyId, status },
  });
  if (error) throw error;
  return data;
}

export async function createRallyInboxThread(args: {
  rallyId: string;
  title: string;
  participants: string[];
  centroid?: { lng: number; lat: number } | null;
}): Promise<{ threadId: string }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ threadId: string }>(
      'rally-inbox-create',
      { body: args },
    );
    if (error) throw error;
    if (data?.threadId) return data;
  } catch {
    return { threadId: `rthread_${Math.random().toString(36).slice(2)}` };
  }
}

export function subscribeRallyInbox(onChange: () => void) {
  const ch = supabase
    .channel('rally-inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_invites' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rallies' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_last_seen' }, onChange)
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(ch);
    } catch {}
  };
}