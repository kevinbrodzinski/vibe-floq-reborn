import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash-es';
import { supabase } from '@/integrations/supabase/client';
import { useClustersLiveBus } from '@/contexts/ClustersLiveContext';

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */
export interface Cluster {
  gh6: string;
  centroid: { type: 'Point'; coordinates: [number, number] };
  total: number;
  vibe_counts: Record<string, number>;
  vibe_mode: string;
  member_count: number;
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
  const liveUnsubRef = useRef<(() => void) | null>(null);
  const bus = useClustersLiveBus();

  /* ----------------------------- fetch ----------------------------- */
  const fetchClusters = useCallback(
    async (box: [number, number, number, number]) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('get_vibe_clusters', {
          min_lng: box[0],
          min_lat: box[1], 
          max_lng: box[2],
          max_lat: box[3],
          p_precision: precision,
        });

        if (error) {
          setError(error.message);
          setClusters([]);
        } else {
          // Transform PostGIS geometry to GeoJSON format
          const transformedData = (data ?? []).map(cluster => {
            // Parse PostGIS geometry - it could be in WKB format or already parsed
            let coordinates: [number, number];
            if (typeof cluster.centroid === 'string') {
              // If it's a WKB string, we'd need to parse it, but for now handle as fallback
              coordinates = [0, 0];
            } else if (cluster.centroid && typeof cluster.centroid === 'object' && 'x' in cluster.centroid && 'y' in cluster.centroid) {
              coordinates = [(cluster.centroid as any).x, (cluster.centroid as any).y];
            } else {
              coordinates = [0, 0];
            }
            
            return {
              ...cluster,
              centroid: {
                type: 'Point' as const,
                coordinates
              },
              vibe_counts: cluster.vibe_counts as Record<string, number>
            } as Cluster;
          });
          setClusters(transformedData);
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

  /* realtime via shared bus (broadcast → refetch) */
  const chanKey = useMemo(
    () => `${precision}:${bbox.map((n) => n.toFixed(3)).join(',')}`,
    [bbox, precision],
  );

  useEffect(() => {
    // Unsubscribe previous
    if (liveUnsubRef.current) {
      liveUnsubRef.current();
      liveUnsubRef.current = null;
    }

    // Ensure a single shared subscription per key
    liveUnsubRef.current = bus.ensureSubscription(chanKey, () => debouncedFetch(bbox));
    setRealtime(true);

    return () => {
      if (liveUnsubRef.current) {
        liveUnsubRef.current();
        liveUnsubRef.current = null;
      }
      setRealtime(false);
    };
  }, [chanKey, bbox, debouncedFetch, bus]);

  /* cleanup */
  useEffect(
    () => () => {
      debouncedFetch.cancel();
      abortRef.current?.abort();
      if (liveUnsubRef.current) liveUnsubRef.current();
    },
    [debouncedFetch],
  );

  return { clusters, loading, error, realtime };
};