import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type VenueStayRow = Database['public']['Tables']['venue_stays']['Row'];
type VenueRow = Database['public']['Tables']['venues']['Row'];
type FloqParticipantRow = Database['public']['Tables']['floq_participants']['Row'];
type AfterglowVenueRow = Database['public']['Tables']['afterglow_venues']['Row'];
type ProfileId = Database['public']['Tables']['profiles']['Row']['id'];

export interface FrequentVenue {
  venue_id: string;
  name: string;
  visit_count: number;
  last_visit: string;
  venue_type?: string;
}

export interface FrequentActivity {
  floq_id: string;
  title: string;
  participation_count: number;
  last_participated: string;
  primary_vibe?: string;
}

export interface FrequentLocation {
  location_name: string;
  visit_count: number;
  last_visit: string;
  lat?: number;
  lng?: number;
}

export interface FrequencyData {
  venues: FrequentVenue[];
  activities: FrequentActivity[];
  locations: FrequentLocation[];
}

export const useFrequencyData = (profileId: string | undefined) => {
  return useQuery({
    queryKey: ['frequency-data', profileId],
    queryFn: async (): Promise<FrequencyData> => {
      if (!profileId) return { venues: [], activities: [], locations: [] };

      // Get most frequent venues from venue_stays
      const { data: venueStays, error: venueStaysError } = await supabase
        .from('venue_stays')
        .select(`
          venue_id,
          arrived_at
        `)
        .eq('profile_id', profileId as ProfileId)
        .gte('arrived_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .order('arrived_at', { ascending: false })
        .returns<Array<Pick<VenueStayRow, 'venue_id' | 'arrived_at'>>>();
      
      if (venueStaysError) throw venueStaysError;

      // Group venue visits and get venue details
      const venueFrequency = new Map<string, { count: number; lastVisit: string }>();
      (venueStays ?? []).forEach(stay => {
        const venueId = String(stay.venue_id);
        const arrivedAt = String(stay.arrived_at);
        const current = venueFrequency.get(venueId) || { count: 0, lastVisit: arrivedAt };
        venueFrequency.set(venueId, {
          count: current.count + 1,
          lastVisit: arrivedAt > current.lastVisit ? arrivedAt : current.lastVisit
        });
      });

      const topVenueIds = Array.from(venueFrequency.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([venueId]) => venueId);

      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, categories')
        .in('id', topVenueIds as ReadonlyArray<VenueRow['id']>)
        .returns<Array<Pick<VenueRow, 'id' | 'name' | 'categories'>>>();

      if (venuesError) throw venuesError;

      const frequentVenues: FrequentVenue[] = (venues ?? []).map(venue => ({
        venue_id: String(venue.id),
        name: String(venue.name),
        visit_count: venueFrequency.get(String(venue.id))?.count || 0,
        last_visit: venueFrequency.get(String(venue.id))?.lastVisit || '',
        venue_type: (venue.categories as string[])?.[0] || 'venue'
      })).sort((a, b) => b.visit_count - a.visit_count);

      // Get most frequent floq activities
      const { data: floqParticipation, error: floqError } = await supabase
        .from('floq_participants')
        .select(`
          floq_id,
          joined_at,
          floqs!inner(title, primary_vibe, ends_at)
        `)
        .eq('profile_id', profileId as ProfileId)
        .gte('joined_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('joined_at', { ascending: false });

      if (floqError) throw floqError;

      const floqFrequency = new Map<string, { count: number; lastJoined: string; title: string; vibe?: string }>();
      (floqParticipation ?? []).forEach(participation => {
        const floq = (participation as any).floqs;
        const floqId = String(participation.floq_id);
        const joinedAt = String(participation.joined_at);
        const current = floqFrequency.get(floqId) || { 
          count: 0, 
          lastJoined: joinedAt,
          title: String(floq?.title || 'Unknown'),
          vibe: String(floq?.primary_vibe || '')
        };
        floqFrequency.set(floqId, {
          count: current.count + 1,
          lastJoined: joinedAt > current.lastJoined ? joinedAt : current.lastJoined,
          title: current.title,
          vibe: current.vibe
        });
      });

      const frequentActivities: FrequentActivity[] = Array.from(floqFrequency.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([floqId, data]) => ({
          floq_id: floqId,
          title: data.title,
          participation_count: data.count,
          last_participated: data.lastJoined,
          primary_vibe: data.vibe
        }));

      // Get frequent locations from afterglow_venues (location names)
      const { data: afterglowVenues } = await supabase
        .from('afterglow_venues')
        .select('name, lat, lng, created_at')
        .eq('profile_id', profileId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const locationFrequency = new Map<string, { count: number; lastVisit: string; lat?: number; lng?: number }>();
      afterglowVenues?.forEach(venue => {
        const current = locationFrequency.get(venue.name) || { 
          count: 0, 
          lastVisit: venue.created_at,
          lat: venue.lat,
          lng: venue.lng
        };
        locationFrequency.set(venue.name, {
          count: current.count + 1,
          lastVisit: venue.created_at > current.lastVisit ? venue.created_at : current.lastVisit,
          lat: current.lat || venue.lat,
          lng: current.lng || venue.lng
        });
      });

      const frequentLocations: FrequentLocation[] = Array.from(locationFrequency.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([name, data]) => ({
          location_name: name,
          visit_count: data.count,
          last_visit: data.lastVisit,
          lat: data.lat,
          lng: data.lng
        }));

      return {
        venues: frequentVenues,
        activities: frequentActivities,
        locations: frequentLocations
      };
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};