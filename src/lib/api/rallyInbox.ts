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
}

export async function listRallyInbox(): Promise<RallyInboxItem[]> {
  const { data, error } = await supabase.rpc('rally_inbox_secure')
  if (error) throw error
  return (data ?? []) as RallyInboxItem[]
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

/** Realtime subscription for invites/rallies changes */
export function subscribeRallyInbox(onChange: () => void) {
  const ch = supabase.channel('rally-inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rally_invites' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rallies' }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch {} }
}