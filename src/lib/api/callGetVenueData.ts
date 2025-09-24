import { supabase } from '@/integrations/supabase/client'

export async function callGetVenueData(
  mode: 'people' | 'energy' | 'posts',
  venueId: string
) {
  const { data, error } = await supabase.functions.invoke('get-venue-intelligence', {
    body: { mode, venue_id: venueId },
  })

  if (error) throw error
  return data
}

// Legacy compatibility exports
export const callGetVenuePeopleList = (venueId: string) => 
  callGetVenueData('people', venueId)

export const callGetVenueSocialEnergy = (venueId: string) => 
  callGetVenueData('energy', venueId)

export const callGetVenueRecentPosts = (venueId: string) => 
  callGetVenueData('posts', venueId)