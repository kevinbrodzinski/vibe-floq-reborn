import { supabase } from '@/integrations/supabase/client'
import type { RallyId } from '@/types/rally'

export async function createRally(args:{
  center:{lng:number;lat:number}
  venueId?:string|null
  ttlMin?:number
  recipients:string[]
  note?:string
}): Promise<{ rallyId: RallyId; expires_at: string; invited: number }> {
  const { data, error } = await supabase.functions.invoke('create-rally', {
    body: {
      center: args.center,
      venue_id: args.venueId ?? null,
      ttl_min: args.ttlMin ?? 60,
      recipients: args.recipients ?? [],
      note: args.note ?? ''
    }
  })
  if (error) throw error
  return data as any
}

export async function joinRally(rallyId: RallyId, status:'joined'|'declined'='joined') {
  const { data, error } = await supabase.functions.invoke('join-rally', {
    body: { rallyId, status }
  })
  if (error) throw error
  return data as any
}