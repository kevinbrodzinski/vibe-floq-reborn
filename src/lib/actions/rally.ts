import { supabase } from '@/integrations/supabase/client'

export async function createRally(participantIds: string[], opts?: {
  name?: string; centroid?: [number,number]; startsAt?: string; meta?: any
}) {
  const { data, error } = await supabase.functions.invoke('rally-create', {
    body: { name: opts?.name, participant_ids: participantIds, centroid: opts?.centroid, starts_at: opts?.startsAt, meta: opts?.meta }
  })
  if (error) {
    if (error.message?.includes('501')) {
      console.warn('[rally-create] Not wired to your schema yet — falling back (501).')
      return null
    }
    throw error
  }
  return data?.plan ?? null
}