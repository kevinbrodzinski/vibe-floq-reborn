import { supabase } from '@/integrations/supabase/client'

export async function createShortlist(name: string, venueIds: string[]): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{id:string}>('shortlist-create', { body: { name, venue_ids: venueIds } })
  if (error) throw error
  return data?.id ?? null
}

export async function listShortlists(): Promise<Array<{id:string;name:string;venueIds:string[];created_at?:string}>> {
  const { data, error } = await supabase.functions.invoke<{shortlists:any[]}>('shortlist-list', { body: {} })
  if (error) return []
  return (data?.shortlists ?? []).map(s => ({
    id: s.id, name: s.name, venueIds: (s.venue_shortlist_items ?? []).map((i:any)=>i.venue_id), created_at: s.created_at
  }))
}

export async function deleteShortlist(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke('shortlist-delete', { body: { id } })
  if (error) throw error
}

export async function renameShortlist(id: string, name: string): Promise<void> {
  const { error } = await supabase.functions.invoke('shortlist-rename', { body: { id, name } })
  if (error) throw error
}