import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash-es';
import { supabase } from '@/integrations/supabase/client';

/* ------------------------------------------------------------------ */
/* types                                                               */
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

/* ------------------------------------------------------------------ */
/* hook                                                                */
/* ------------------------------------------------------------------ */
export const useClusters = (
  bbox: [number, number, number, number],
  precision = 6,
): ClustersState => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ----------------------------- fetch ----------------------------- */
  const fetchClusters = useCallback(
    async (box: [number, number, number, number]) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke('clusters', {
          body: { bbox: box, precision },
          // ⚠️  Supabase v2 invoke does *not* accept AbortController.signal
        });

        if (error) {
          setError(error.message);
          setClusters([]);
        } else {
          setClusters(data ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
        setClusters([]);
      } finally {
        setLoading(false);
      }
    },
    [precision],
  );

  const debouncedFetch = useMemo(() => debounce(fetchClusters, 300), [fetchClusters]);

  /* watch bbox */
  useEffect(() => {
    debouncedFetch(bbox);
  }, [bbox, debouncedFetch]);

  /* realtime channel (broadcast → refetch) */
  const chanKey = useMemo(
    () => `${precision}:${bbox.map((n) => n.toFixed(3)).join(',')}`,
    [bbox, precision],
  );

  useEffect(() => {
    if (chanRef.current) supabase.removeChannel(chanRef.current);
    setRealtime(false);

    const ch = supabase
      .channel(`clusters-${chanKey}`)
      .on('broadcast', { event: 'clusters_updated' }, () => debouncedFetch(bbox))
      .subscribe((status) => setRealtime(status === 'SUBSCRIBED'));

    chanRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, [chanKey, bbox, debouncedFetch]);

  /* cleanup */
  useEffect(
    () => () => {
      debouncedFetch.cancel();
      abortRef.current?.abort();
      if (chanRef.current) supabase.removeChannel(chanRef.current);
    },
    [debouncedFetch],
  );

  return { clusters, loading, error, realtime };
};