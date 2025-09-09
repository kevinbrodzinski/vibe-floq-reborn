import { supabase } from '@/integrations/supabase/client'

export async function listVenueFavorites(): Promise<Set<string>> {
  const { data, error } = await supabase.functions.invoke<{favoriteIds:string[]}>('venue-favorites', { body: {} })
  if (error) return new Set()
  return new Set(data?.favoriteIds ?? [])
}

export async function toggleVenueFavorite(venueId: string, desired?: boolean): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke<{favorited:boolean}>('venue-favorite', {
    body: { venue_id: venueId, op: desired == null ? 'toggle' : 'set', value: desired }
  })
  if (error) throw error
  return !!data?.favorited
}