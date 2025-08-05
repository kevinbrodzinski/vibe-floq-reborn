import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Cluster } from './useClusters';

/**
 * Lightweight helper that keeps a live subscription once the initial
 * cluster list is in place.  Sent-in callbacks come from parent component.
 */
export const useClustersLive = (
  initial: Cluster[],
  setClusters: React.Dispatch<React.SetStateAction<Cluster[]>>,
  refetch: () => void,
) => {
  const chanRef        = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastChecksum   = useRef<string | null>(null);

  useEffect(() => {
    if (chanRef.current || initial.length > 300) return; // skip very dense maps

    const ch = supabase
      .channel('clusters-live')
      .on('broadcast', { event: 'clusters_updated' }, (payload) => {
        const checksum = payload.payload?.checksum;
        if (checksum && checksum !== lastChecksum.current) {
          lastChecksum.current = checksum;
          import.meta.env.DEV &&
            console.log('[LiveClusters] checksum changed → refetch');
          refetch();
        }
      })
      .subscribe();

    chanRef.current = ch;

    return () => {
      if (chanRef.current) supabase.removeChannel(chanRef.current);
      chanRef.current = null;
    };
  }, [initial.length, refetch]);

  /* no UI returned */
};