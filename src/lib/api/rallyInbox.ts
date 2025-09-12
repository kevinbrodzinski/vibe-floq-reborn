import { supabase } from '@/integrations/supabase/client'
import type { RallyId } from '@/types/rally'

export type RallyInboxItem = {
  rally_id: RallyId
  created_at: string
  expires_at: string
  center_lng: number
  center_lat: number
  venue_id?: string|null
  note?: string|null
  creator_id: string
  creator_name?: string|null
  creator_avatar?: string|null
  invite_status: 'pending'|'joined'|'declined'
  responded_at?: string|null
  joined_count: number
  unread_count?: number
  first_unread_at?: string|null
  last_message_at?: string|null
  last_message_excerpt?: string|null
}

export async function listRallyInbox(): Promise<RallyInboxItem[]> {
  // Try new optimized inbox first, fallback to legacy
  try {
    const { data, error } = await supabase.rpc('get_rally_inbox')
    if (error) throw error
    return (data ?? []) as RallyInboxItem[]
  } catch (error) {
    // Fallback to legacy implementation
    const { data, error: legacyError } = await supabase.rpc('rally_inbox_secure')
    if (legacyError) throw legacyError
    return (data ?? []) as RallyInboxItem[]
  }
}

export async function respondInvite(rallyId: RallyId, status:'joined'|'declined'='joined') {
  // leans on your join-rally edge function
  const { data, error } = await supabase.functions.invoke('join-rally', {
    body: { rallyId, status }
  })
  if (error) throw error
  return data
}

export async function createRallyInboxThread(args: {
  rallyId: string
  title: string
  participants: string[]
  centroid?: { lng: number; lat: number } | null
}): Promise<{ threadId: string }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ threadId: string }>('rally-inbox-create', {
      body: args
    })
    if (error) throw error
    if (data?.threadId) return data
  } catch (e) {
    // Fallback optimistic thread id
    return { threadId: `rthread_${Math.random().toString(36).slice(2)}` }
  }
}

export async function markRallyRead(rallyId: string): Promise<void> {
  // Prefer RPC...
  try {
    const { error } = await supabase.rpc('rally_mark_seen', { _rally_id: rallyId });
    if (error) throw error;
    return;
  } catch {
    // ...fallback to direct upsert
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) return;

    const { error } = await supabase
      .from('rally_last_seen')
      .upsert({ profile_id: me, rally_id: rallyId, last_seen_at: new Date().toISOString() },
              { onConflict: 'profile_id,rally_id' });
    if (error) throw error;
  }
}

export async function markAllRalliesRead(): Promise<void> {
  try {
    const { error } = await supabase.rpc('rally_mark_all_seen');
    if (error) throw error;
    return;
  } catch {
    // Fallback: derive rallies and upsert in bulk
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) return;

    try {
      const { data: inbox } = await supabase.rpc('get_rally_inbox');
      const rows = (inbox ?? []).map((x: any) => ({
        profile_id: me,
        rally_id: x.rally_id,
        last_seen_at: new Date().toISOString(),
      }));
      if (!rows.length) return;

      const { error } = await supabase.from('rally_last_seen')
        .upsert(rows, { onConflict: 'profile_id,rally_id' });
      if (error) throw error;
    } catch {
      // Final fallback - just fail silently
      console.warn('Mark all read failed');
    }
  }
}

export async function setRallyLastSeen(rallyId: string, ts?: string) {
  const when = ts ?? new Date().toISOString();

  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return;

  const { error } = await supabase
    .from('rally_last_seen')
    .upsert({ 
      profile_id: me, 
      rally_id: rallyId, 
      last_seen_at: when 
    }, { 
      onConflict: 'profile_id,rally_id' 
    });

  if (error) throw error;
}

export async function markRallyThreadSeen(threadId: string) {
  try {
    // First get the rally_id from the thread
    const { data: thread } = await supabase
      .from('rally_threads')
      .select('rally_id')
      .eq('id', threadId)
      .maybeSingle()

    if (!thread?.rally_id) return

    await setRallyLastSeen(thread.rally_id);
  } catch (err) {
    console.warn('rally thread seen update failed:', err);
  }
}

/** Realtime subscription for invites/rallies changes */
export function subscribeRallyInbox(onChange: () => void) {
  const ch = supabase.channel('rally-inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_invites' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rallies' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_last_seen' }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch {} }
}