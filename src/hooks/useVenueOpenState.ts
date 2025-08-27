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
    queryFn: async (): Promise<VenueOpenState | null> => {
      if (!venueId) return null;
      
      const { data, error } = await supabase
        .from('v_venue_open_state')
        .select('venue_id, tzid, hours_today, open_now')
        .eq('venue_id', venueId as any)
        .maybeSingle();
      
      if (error) throw error;
      return data as any;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - venue status changes relatively slowly
    gcTime: 5 * 60 * 1000, // 5 minutes
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
    queryFn: async (): Promise<VenueOpenState[]> => {
      if (venueIds.length === 0) return [];
      
      // Use the helper function for batch fetching
      const { data, error } = await supabase
        .rpc('get_venues_open_status', {
          p_venue_ids: venueIds
        }).returns<any>();
      
      if (error) {
        // Fallback to direct view query if RPC fails
        console.warn('RPC failed, falling back to view query:', error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('v_venue_open_state')
          .select('venue_id, tzid, hours_today, open_now')
          .in('venue_id', venueIds as any);
        
        if (fallbackError) throw fallbackError;
        return (fallbackData as any) || [];
      }
      
      return (data as any) || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - open status changes less frequently
    gcTime: 15 * 60 * 1000,   // 15 minutes cache (renamed from cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on focus for better performance
    refetchOnMount: false,       // Don't refetch on component mount if data exists
    refetchOnReconnect: false,   // Don't refetch when network reconnects
    networkMode: 'offlineFirst', // Use cache first, then network
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
  
  // Filter out null/undefined/empty values
  const validHours = hoursToday.filter(h => h && typeof h === 'string' && h.trim());
  
  if (validHours.length === 0) {
    return 'Hours unavailable';
  }
  
  if (validHours.length === 1) {
    return validHours[0];
  }
  
  // Multiple time slots
  return validHours.join(', ');
}

/**
 * Utility function to get next open time text
 */
export function getNextOpenText(openNow: boolean | null, hoursToday: string[] | null): string | null {
  if (openNow === true) return null; // Already open
  if (!hoursToday || hoursToday.length === 0) return null;
  
  // Extract opening time from first slot (format: "09:00–17:00")
  const firstSlot = hoursToday[0];
  if (!firstSlot || typeof firstSlot !== 'string') return null;
  
  const parts = firstSlot.split('–');
  const openTime = parts[0];
  
  if (openTime && openTime.trim()) {
    return `Opens ${openTime}`;
  }
  
  return null;
}