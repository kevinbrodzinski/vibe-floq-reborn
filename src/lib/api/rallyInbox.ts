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

export async function markRallySeen(rallyId: string) {
  try {
    const { error } = await supabase.rpc('mark_rally_seen', { p_rally_id: rallyId });
    if (error) throw error;
  } catch (err) {
    // Gracefully handle case where new RPC doesn't exist yet
    console.warn('mark_rally_seen RPC not available:', err);
  }
}

export async function markRallyThreadSeen(threadId: string) {
  try {
    // Use direct SQL call since RPC may not be available yet
    const { error } = await supabase
      .from('rally_last_seen')
      .upsert({
        profile_id: (await supabase.auth.getUser()).data.user?.id,
        rally_id: threadId, // Will need to be resolved from thread
        last_seen: new Date().toISOString()
      })
    if (error) throw error;
  } catch (err) {
    console.warn('rally thread seen update failed:', err);
  }
}

/** Realtime subscription for invites/rallies changes */
export function subscribeRallyInbox(onChange: () => void) {
  const ch = supabase.channel('rally-inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_invites' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rallies' }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch {} }
}