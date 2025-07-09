import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NearbyUser } from '@/types';

interface NearbyPresenceOptions {
  km?: number;
  self?: boolean;
}

export function useNearbyPresence(
  lat?: number,
  lng?: number,
  { km = 1, self = false }: NearbyPresenceOptions = {}
) {
  const [people, setPeople] = useState<Record<string, NearbyUser>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  // Throttled state update to prevent render jank
  const updatePeople = useCallback((updater: (prev: Record<string, NearbyUser>) => Record<string, NearbyUser>) => {
    requestAnimationFrame(() => setPeople(updater));
  }, []);

  // Initial fetch of nearby presence
  useEffect(() => {
    if (!lat || !lng) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchNearby = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_nearby_presence', { 
          user_lat: lat, 
          user_lng: lng, 
          radius_meters: km * 1000 
        });

        if (rpcError) {
          console.error('Failed to fetch nearby presence:', rpcError);
          setError(rpcError.message);
          return;
        }

        const initial: Record<string, NearbyUser> = {};
        (data || []).forEach((user) => {
          initial[user.user_id] = user;
        });
        setPeople(initial);
      } catch (err) {
        console.error('Error fetching nearby presence:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchNearby();
  }, [lat, lng, km]);

  // Realtime subscription to vibes_now changes
  useEffect(() => {
    const channel = supabase
      .channel('presence-watch')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'vibes_now'
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          
          updatePeople((prev) => {
            const next = { ...prev };
            
            if (eventType === 'DELETE') {
              const userId = oldRow?.user_id;
              if (userId && next[userId]) {
                delete next[userId];
              }
            } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const userId = newRow?.user_id;
              if (userId && newRow) {
                // Convert the database row to NearbyUser format
                next[userId] = {
                  user_id: userId,
                  vibe: newRow.vibe,
                  distance_meters: 0, // We'll need to calculate this if needed
                  updated_at: newRow.updated_at || new Date().toISOString()
                };
              }
            }
            
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updatePeople]);

  // Cleanup expired presence data
  useEffect(() => {
    const cleanup = () => {
      updatePeople((prev) => {
        const now = new Date();
        const filtered: Record<string, NearbyUser> = {};
        
        Object.entries(prev).forEach(([userId, user]) => {
          // Assume presence expires after 2 minutes if no explicit expiry
          const updatedAt = new Date(user.updated_at);
          const expiryTime = new Date(updatedAt.getTime() + 2 * 60 * 1000); // 2 minutes
          
          if (expiryTime > now) {
            filtered[userId] = user;
          }
        });
        
        return filtered;
      });
    };

    // Clean up every 30 seconds
    cleanupTimeoutRef.current = setInterval(cleanup, 30000);

    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, [updatePeople]);

  // Convert to array and optionally filter out self
  const currentUserId = supabase.auth.getUser()?.then(({ data }) => data.user?.id);
  const list = Object.values(people).filter((person) => {
    // For now, we don't have easy access to current user ID synchronously
    // This could be improved by using auth context
    return self || true; // Include all users for now
  });

  return {
    nearby: list,
    loading,
    error,
    count: list.length
  };
}