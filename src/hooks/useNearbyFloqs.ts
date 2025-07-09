import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Type for the walkable floqs RPC return
type WalkableFloq = {
  id: string;
  title: string;
  primary_vibe: string;
  participant_count: number;
  distance_meters: number;
  starts_at: string;
};

interface NearbyFloqsOptions {
  km?: number;
}

export function useNearbyFloqs(
  lat?: number,
  lng?: number,
  { km = 1 }: NearbyFloqsOptions = {}
) {
  const [floqs, setFloqs] = useState<WalkableFloq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Throttled state update to prevent render jank
  const updateFloqs = useCallback((updater: (prev: WalkableFloq[]) => WalkableFloq[]) => {
    requestAnimationFrame(() => setFloqs(updater));
  }, []);

  // Initial fetch of nearby floqs
  useEffect(() => {
    if (!lat || !lng) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchNearbyFloqs = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_walkable_floqs', { 
          user_lat: lat, 
          user_lng: lng, 
          max_walk_meters: km * 1000 
        });

        if (rpcError) {
          console.error('Failed to fetch nearby floqs:', rpcError);
          setError(rpcError.message);
          return;
        }

        setFloqs(data || []);
      } catch (err) {
        console.error('Error fetching nearby floqs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyFloqs();
  }, [lat, lng, km]);

  // Realtime subscription to floqs changes
  useEffect(() => {
    if (!lat || !lng) return;

    const channel = supabase
      .channel('floqs-watch')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'floqs'
        },
        () => {
          // Refetch data when floqs change
          updateFloqs(() => {
            // Trigger refetch by updating state
            const refetch = async () => {
              try {
                const { data, error: rpcError } = await supabase.rpc('get_walkable_floqs', { 
                  user_lat: lat, 
                  user_lng: lng, 
                  max_walk_meters: km * 1000 
                });

                if (!rpcError && data) {
                  setFloqs(data);
                }
              } catch (err) {
                console.error('Error refetching floqs:', err);
              }
            };
            
            refetch();
            return floqs; // Return current state for now
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lat, lng, km, updateFloqs, floqs]);

  return {
    nearby: floqs,
    loading,
    error,
    count: floqs.length
  };
}