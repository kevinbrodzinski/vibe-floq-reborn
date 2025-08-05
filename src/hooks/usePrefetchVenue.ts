import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePrefetchVenue = () => {
  const queryClient = useQueryClient();
  
  return (venueId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['venue-details', venueId],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('venue_details', { p_venue_id: venueId })
          .single();
        
        if (error) throw error;
        if (!data) throw new Error('Venue not found');
        
        return data;
      },
      staleTime: 60_000, // 1 minute
    });
  };
};