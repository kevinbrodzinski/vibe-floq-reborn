import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { typedRpc } from '@/lib/typedRpc';
import { useAuth } from '@/hooks/useAuth';

export interface MapPerson {
  id: string;
  lat: number;
  lng: number;
  vibe?: string | null;
  isFriend: boolean;
}

export function useVisibleFriendsOnMap() {
  const { user } = useAuth();
  const viewerId = user?.id;
  const [people, setPeople] = useState<MapPerson[]>([]);
  const lastSeen = useRef<Record<string, number>>({});

  // Bootstrap from RPC
  useEffect(() => {
    let abort = false;
    if (!viewerId) return;

    (async () => {
      try {
        const rows = await typedRpc<Array<{ profile_id: string; lat: number; lng: number; vibe: string | null; updated_at: string }>>(
          'get_visible_friend_presence',
          { p_viewer: viewerId }
        );

        if (abort) return;
        const now = Date.now();
        const mapped: MapPerson[] = (rows || []).map(r => {
          lastSeen.current[r.profile_id] = new Date(r.updated_at).getTime();
          return {
            id: r.profile_id,
            lat: r.lat,
            lng: r.lng,
            vibe: r.vibe,
            isFriend: true,
          };
        });
        setPeople(mapped);
      } catch (e) {
        console.warn('[useVisibleFriendsOnMap] bootstrap failed', e);
      }
    })();

    return () => { abort = true; };
  }, [viewerId]);

  // Realtime subscription to presence table
  useEffect(() => {
    if (!viewerId) return;

    const channel = supabase
      .channel(`presence:friends:${viewerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, (payload) => {
        const newRow: any = payload.new;
        const oldRow: any = payload.old;

        // Only process rows with coords
        const pid = (newRow?.profile_id ?? oldRow?.profile_id) as string | undefined;
        if (!pid || (viewerId === pid)) return;

        const ts = newRow?.updated_at ? new Date(newRow.updated_at).getTime() : Date.now();
        lastSeen.current[pid] = ts;

        if (payload.eventType === 'DELETE') {
          setPeople(prev => prev.filter(p => p.id !== pid));
          return;
        }

        if (newRow?.lat != null && newRow?.lng != null) {
          setPeople(prev => {
            const idx = prev.findIndex(p => p.id === pid);
            const next = { id: pid, lat: newRow.lat, lng: newRow.lng, vibe: newRow.vibe ?? null, isFriend: true } as MapPerson;
            if (idx === -1) return [...prev, next];
            const copy = prev.slice();
            copy[idx] = next;
            return copy;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [viewerId]);

  // Evict stale entries client-side (e.g., 10 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 10 * 60 * 1000;
      setPeople(prev => prev.filter(p => (lastSeen.current[p.id] ?? 0) > cutoff));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const result = useMemo(() => people, [people]);
  return { people: result };
}