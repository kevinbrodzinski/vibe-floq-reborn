import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchVenueSnapshot } from '@/lib/api/venues';
import { supabase } from '@/integrations/supabase/client';

export const useVenueLiveCounter = (venueId: string) => {
  const qc = useQueryClient();

  // 1. initial+cached read
  const snap = useQuery({
    queryKey: ['venueSnapshot', venueId],
    queryFn: () => fetchVenueSnapshot(venueId),
    staleTime: 15_000,
    enabled: !!venueId
  });

  // 2. realtime push – small payload, only this venue
  useEffect(() => {
    if (!venueId) return;

    const channel = supabase
      .channel(`venue_snapshot_${venueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          table: 'venue_presence_snapshot',
          schema: 'public',
          filter: `venue_id=eq.${venueId}`
        },
        payload => {
          qc.setQueryData(['venueSnapshot', venueId], payload.new);
        }
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [venueId, qc]);

  return snap;
};