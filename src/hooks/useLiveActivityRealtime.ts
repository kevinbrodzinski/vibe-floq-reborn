import { useEffect }       from 'react';
import { supabase }        from '@/integrations/supabase/client';
import { useQueryClient }  from '@tanstack/react-query';

export function useLiveActivityRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('pulse-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pulse_events' },
        () => qc.invalidateQueries(['live-activity']),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
} 