import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VenueOpenState {
  venue_id: string;
  tzid: string | null;
  hours_today: string[] | null;
  open_now: boolean | null;
}

/**
 * Hook to fetch venue open state for a single venue
 */
export function useVenueOpenState(venueId: string | null) {
  return useQuery<VenueOpenState | null>({
    queryKey: ['venue-open-state', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      if (!venueId) return null;
      
      const { data, error } = await supabase
        .from('v_venue_open_state')
        .select('venue_id, tzid, hours_today, open_now')
        .eq('venue_id', venueId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - venue status changes relatively slowly
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2,
  });
}

/**
 * Hook to fetch venue open state for multiple venues at once
 * More efficient than multiple individual calls
 */
export function useVenuesOpenState(venueIds: string[]) {
  return useQuery<VenueOpenState[]>({
    queryKey: ['venues-open-state', venueIds.sort().join(',')],
    enabled: venueIds.length > 0,
    queryFn: async () => {
      if (venueIds.length === 0) return [];
      
      // Use the helper function for batch fetching
      const { data, error } = await supabase
        .rpc('get_venues_open_status', {
          p_venue_ids: venueIds
        });
      
      if (error) {
        // Fallback to direct view query if RPC fails
        console.warn('RPC failed, falling back to view query:', error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('v_venue_open_state')
          .select('venue_id, tzid, hours_today, open_now')
          .in('venue_id', venueIds);
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

/**
 * Utility function to format hours for display
 */
export function formatVenueHours(hoursToday: string[] | null): string {
  if (!hoursToday || hoursToday.length === 0) {
    return 'Hours unavailable';
  }
  
  if (hoursToday.length === 1) {
    return hoursToday[0];
  }
  
  // Multiple time slots
  return hoursToday.join(', ');
}

/**
 * Utility function to get next open time text
 */
export function getNextOpenText(openNow: boolean | null, hoursToday: string[] | null): string | null {
  if (openNow === true) return null; // Already open
  if (!hoursToday || hoursToday.length === 0) return null;
  
  // Extract opening time from first slot (format: "09:00–17:00")
  const firstSlot = hoursToday[0];
  const openTime = firstSlot.split('–')[0];
  
  if (openTime) {
    return `Opens ${openTime}`;
  }
  
  return null;
}