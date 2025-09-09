import { supabase } from '@/integrations/supabase/client'

export async function mintShortlistToken(shortlistId: string, days = 7) {
  const { data, error } = await supabase.functions.invoke<{token:string;expires_at:string}>(
    'shortlist-share',
    { body: { shortlist_id: shortlistId, days } }
  )
  if (error) throw error
  return data!
}

export async function loadPublicShortlist(token: string) {
  const { data, error } = await supabase.functions.invoke<{shortlist:any}>(
    'shortlist-public-get',
    { body: { token } }
  )
  if (error) throw error
  return data?.shortlist ?? null
}