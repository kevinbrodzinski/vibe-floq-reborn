import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase }         from '@/integrations/supabase/client';
import type { PulseEvent }  from '@/types/pulse';

export const useLiveActivity = (pageSize = 20) =>
  useInfiniteQuery<PulseEvent[]>({
    queryKey : ['live-activity'],
    initialPageParam: null,
    queryFn  : async ({ pageParam = null }) => {
      const { data, error } = await supabase
        .rpc('get_live_activity', {
          p_cursor : pageParam,   // null on first page
          p_limit  : pageSize,
        });

      if (error) throw error;
      return data as PulseEvent[];
    },
    getNextPageParam: (lastPage) =>
      lastPage.length < pageSize
        ? undefined                       // no more pages
        : lastPage[lastPage.length - 1].id, // use last id as cursor
    staleTime : 30_000,   // 30 s – feed is mostly real-time
  });