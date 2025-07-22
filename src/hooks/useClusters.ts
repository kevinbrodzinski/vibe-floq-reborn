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

export const useClusters = (
  bbox: [number, number, number, number],
  precision = 6,
): UseClustersReturn => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);

  /* ------------------------------------------------------------------
    debounced bbox 
   ------------------------------------------------------------------ */
  const debouncedBbox = useMemo(() => bbox, [bbox]); // already outer-debounced

  /* ------------------------------------------------------------------
    Supabase realtime channel 
   ------------------------------------------------------------------ */
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ------------------------------------------------------------------
    Fetch function 
   ------------------------------------------------------------------ */
  const fetchClusters = useCallback(
    async (box: [number, number, number, number]) => {
      abortControllerRef.current?.abort();
      const ac = new AbortController();
      abortControllerRef.current = ac;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke("clusters", {
          body: { bbox: box, precision },
        });

        if (ac.signal.aborted) return;

        if (error) {
          setError(error.message ?? "Edge function failed");
          setClusters([]);
        } else {
          setClusters(data ?? []);
        }
      } catch (err) {
        if (ac.signal.aborted) return;       // ← add abort short-circuit
        if (!ac.signal.aborted) {
          setError(err instanceof Error ? err.message : "Network error");
          setClusters([]);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false); // ✅ always clear
      }
    },
    [precision],
  );

  const debouncedFetch = useMemo(
    () => debounce(fetchClusters, 300),
    [fetchClusters],
  );

  /* ------------------------------------------------------------------
    Initial / bbox-change fetch 
   ------------------------------------------------------------------ */
  useEffect(() => {
    debouncedFetch(debouncedBbox);
  }, [debouncedBbox, debouncedFetch]);

  /* ------------------------------------------------------------------
    Realtime 
   ------------------------------------------------------------------ */
  const key = useMemo(
    () => `${precision}:${debouncedBbox.map((n) => n.toFixed(3)).join(",")}`,
    [debouncedBbox, precision],
  );

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsRealTimeConnected(false);
    }

    const ch = supabase
      .channel(`clusters-${key}`)
      .on("broadcast", { event: "clusters_updated" }, () =>
        debouncedFetch(debouncedBbox),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsRealTimeConnected(true);
        if (status === "CLOSED" || status === "TIMED_OUT") setIsRealTimeConnected(false);
      });

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      setIsRealTimeConnected(false);
    };
  }, [key, debouncedBbox, debouncedFetch]);

  /* ------------------------------------------------------------------
    Cleanup 
   ------------------------------------------------------------------ */
  useEffect(
    () => () => {
      debouncedFetch.cancel();
      abortControllerRef.current?.abort();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    },
    [debouncedFetch],
  );

  /* ------------------------------------------------------------------ */
  return { clusters, loading, error, isRealTimeConnected };
};