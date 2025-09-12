import { supabase } from '@/integrations/supabase/client';

export type RallyMessage = {
  id: string;
  thread_id: string;
  profile_id?: string;
  sender_id?: string;
  body?: string;
  kind: string;
  created_at: string;
  metadata?: any;
};

export async function getLastSeen(rallyId: string): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) throw new Error('not authenticated');

  const { data, error } = await supabase
    .from('rally_last_seen')
    .select('last_seen_at')
    .eq('rally_id', rallyId)
    .eq('profile_id', me)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.last_seen_at ?? null;
}

export async function listThreadMessages(threadId: string): Promise<RallyMessage[]> {
  const { data, error } = await supabase
    .from('rally_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}


export function computeFirstUnread(messages: RallyMessage[], lastSeen: string | null) {
  if (!messages.length) return { index: null, t: null };
  if (!lastSeen) return { index: 0, t: messages[0].created_at };

  const lastMs = new Date(lastSeen).getTime();
  const idx = messages.findIndex((m) => new Date(m.created_at).getTime() > lastMs);

  if (idx === -1) return { index: null, t: null };
  return { index: idx, t: messages[idx].created_at };
}