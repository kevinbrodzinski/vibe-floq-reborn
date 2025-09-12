import { supabase } from '@/integrations/supabase/client'
import type { RallyId } from '@/types/rally'

export function headsCentroid(
  heads: Array<{ lng: number; lat: number }>
): { lng: number; lat: number } | null {
  if (!heads?.length) return null;
  const lng = heads.reduce((s, h) => s + h.lng, 0) / heads.length;
  const lat = heads.reduce((s, h) => s + h.lat, 0) / heads.length;
  return { lng, lat };
}

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