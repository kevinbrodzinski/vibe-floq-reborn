import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export const useFriendVisitStats = (venueId: string, viewerId: string) =>
  useQuery({
    queryKey: ['friendVisits', viewerId, venueId],
    enabled: !!viewerId && !!venueId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_friend_visit_stats', { p_viewer: viewerId, p_venue: venueId })
        .single();
      if (error) throw error;
      return {
        count: data.friend_count as number,
        friends: (data.friend_list as string[]) ?? [],
      };
    },
  });

export const useToggleVenueBump = (venueId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('toggle_venue_bump', { p_venue: venueId })
        .single();
      if (error) throw error;
      return data as number;
    },
    onSuccess: (newCount) => {
      // Invalidate and update the live bump count
      queryClient.setQueryData(['liveBumpCount', venueId], newCount);
    },
  });
};

export const useLiveBumpCount = (venueId: string) => {
  const [count, setCount] = useState<number | null>(null);
  
  // Initial fetch
  useQuery({
    queryKey: ['liveBumpCount', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { count: initialCount } = await supabase
        .from('venue_bumps')
        .select('*', { head: true, count: 'exact' })
        .eq('venue_id', venueId);
      
      const bumpCount = initialCount ?? 0;
      setCount(bumpCount);
      return bumpCount;
    },
  });

  useEffect(() => {
    if (!venueId) return;
    
    const channel = supabase
      .channel(`bump:${venueId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'venue_bumps', 
          filter: `venue_id=eq.${venueId}` 
        },
        async () => {
          // Refetch count when bumps change
          const { count: newCount } = await supabase
            .from('venue_bumps')
            .select('*', { head: true, count: 'exact' })
            .eq('venue_id', venueId);
          
          setCount(newCount ?? 0);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);
  
  return count;
};