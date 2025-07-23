// ─────────────────────────────────────────────────────────────
// src/hooks/useClusters.ts
// ─────────────────────────────────────────────────────────────
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { debounce } from "lodash-es";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Cluster {
  gh6: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  total: number;
  vibe_counts: Record<string, number>;
}

interface UseClustersReturn {
  clusters: Cluster[];
  loading: boolean;
  error: string | null;
  isRealTimeConnected: boolean;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                 */
/* ------------------------------------------------------------------ */

export const useClusters = (
  bbox: [number, number, number, number],
  precision = 6,
): UseClustersReturn => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ------------------------------------------------------------------ */
  /* Debounced fetch                                                     */
  /* ------------------------------------------------------------------ */

  const fetchClusters = useCallback(
    async (box: [number, number, number, number]) => {
      // cancel any in-flight request
      abortControllerRef.current?.abort();
      const ac = new AbortController();
      abortControllerRef.current = ac;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke("clusters", {
          body: { bbox: box, precision },
        });

        if (ac.signal.aborted) return; // stale

        if (error) {
          setError(error.message ?? "Edge function failed");
          setClusters([]);
        } else {
          setClusters(data ?? []);
        }
      } catch (err: unknown) {
        if (ac.signal.aborted) return; // aborted; ignore
        setError(
          err instanceof Error ? err.message : "Unknown network error",
        );
        setClusters([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [precision],
  );

  const debouncedFetch = useMemo(
    () => debounce(fetchClusters, 300),
    [fetchClusters],
  );

  /* ------------------------------------------------------------------ */
  /* Effect: fetch on bbox change                                        */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    debouncedFetch(bbox);
  }, [bbox, debouncedFetch]);

  /* ------------------------------------------------------------------ */
  /* Realtime channel                                                    */
  /* ------------------------------------------------------------------ */

  const channelKey = useMemo(
    () => `${precision}:${bbox.map((n) => n.toFixed(3)).join(",")}`,
    [bbox, precision],
  );

  useEffect(() => {
    // tear down existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsRealTimeConnected(false);
    }

    const ch = supabase
      .channel(`clusters-${channelKey}`)
      .on("broadcast", { event: "clusters_updated" }, () =>
        debouncedFetch(bbox),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsRealTimeConnected(true);
        if (["CLOSED", "TIMED_OUT", "CHANNEL_ERROR"].includes(status))
          setIsRealTimeConnected(false);
      });

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      setIsRealTimeConnected(false);
    };
  }, [channelKey, bbox, debouncedFetch]);

  /* ------------------------------------------------------------------ */
  /* Cleanup                                                             */
  /* ------------------------------------------------------------------ */

  useEffect(
    () => () => {
      debouncedFetch.cancel();
      abortControllerRef.current?.abort();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    },
    [debouncedFetch],
  );

  return { clusters, loading, error, isRealTimeConnected };
};