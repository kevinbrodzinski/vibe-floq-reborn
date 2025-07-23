import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash-es';
import { supabase } from '@/integrations/supabase/client';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export interface Cluster {
  gh6: string;
  centroid: { type: 'Point'; coordinates: [number, number] };
  total: number;
  vibe_counts: Record<string, number>;
}

export interface ClustersState {
  clusters: Cluster[];
  loading: boolean;
  error: string | null;
  realtime: boolean;
}

/**
 * Fetches (and live-subscribes to) vibe clusters for a given bbox.
 * @param bbox      [minLng,minLat,maxLng,maxLat]
 * @param precision Geo-hash precision (default 6)
 */
export function useClusters(
  bbox: [number, number, number, number],
  precision = 6,
): ClustersState {
  const [state, setState] = useState<ClustersState>({
    clusters : [],
    loading  : false,
    error    : null,
    realtime : false,
  });

  /* ---------- refs to cancel fetch / realtime ---------------------- */
  const abortRef = useRef<AbortController | null>(null);
  const chanRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ---------- fetcher ---------------------------------------------- */
  const fetchClusters = useCallback(
    async (box: [number, number, number, number]) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setState(s => ({ ...s, loading: true, error: null }));

      try {
        // NB: supabase-js typings don’t include “signal” – cast to any
        const { data, error } = await supabase.functions.invoke<any>(
          'clusters',
          { body: { bbox: box, precision } } as any,
        );

        if (error) throw error;
        setState(s => ({ ...s, clusters: data ?? [] }));
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setState(s => ({
          ...s,
          clusters: [],
          error   : e?.message ?? 'Network error',
        }));
      } finally {
        setState(s => ({ ...s, loading: false }));
      }
    },
    [precision],
  );

  const debouncedFetch = useMemo(() => debounce(fetchClusters, 300), [fetchClusters]);

  /* ---------- react to bbox change --------------------------------- */
  useEffect(() => { debouncedFetch(bbox); }, [bbox, debouncedFetch]);

  /* ---------- realtime channel ------------------------------------- */
  const chanKey = useMemo(
    () => `${precision}:${bbox.map(n => n.toFixed(3)).join(',')}`,
    [bbox, precision],
  );

  useEffect(() => {
    if (chanRef.current) supabase.removeChannel(chanRef.current);
    setState(s => ({ ...s, realtime: false }));

    const ch = supabase
      .channel(`clusters-${chanKey}`)
      .on('broadcast', { event: 'clusters_updated' }, () => debouncedFetch(bbox))
      .subscribe(status => setState(s => ({ ...s, realtime: status === 'SUBSCRIBED' })));

    chanRef.current = ch;

    return () => { supabase.removeChannel(ch); };
  }, [chanKey, bbox, debouncedFetch]);

  /* ---------- unmount ---------------------------------------------- */
  useEffect(() => () => {
    debouncedFetch.cancel();
    abortRef.current?.abort();
    if (chanRef.current) supabase.removeChannel(chanRef.current);
  }, [debouncedFetch]);

  return state;
}