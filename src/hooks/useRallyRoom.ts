import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withGate } from '@/core/privacy/withGate';
import { edgeLog } from '@/lib/edgeLog';

type RallyEvent =
  | { type: 'rally_created'; rallyId: string; host: string; ts: number; meta?: any }
  | { type: 'rally_joined'; rallyId: string; userId: string; ts: number }
  | { type: 'rally_left'; rallyId: string; userId: string; ts: number }
  | { type: 'rally_stopped'; rallyId: string; host: string; ts: number }
  | { type: 'rally_ping'; rallyId: string; userId: string; ts: number; etaBand?: string };

export function useRallyRoom(rallyId?: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const channelName = useMemo(() => rallyId ? `rally:${rallyId}` : null, [rallyId]);

  useEffect(() => {
    if (!channelName) return;
    
    const ch = supabase.channel(channelName, { 
      config: { presence: { key: 'user' } } 
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, Array<any>>;
      const ids = Object.values(state).flat().map((p: any) => p.user_id).filter(Boolean);
      setMembers([...new Set(ids)]);
    });

    ch.on('broadcast', { event: 'rally_evt' }, ({ payload }) => {
      const e = payload as RallyEvent;
      edgeLog('rally_evt', { ...e, channelName });
    });

    ch.subscribe((status) => { 
      if (status === 'SUBSCRIBED') {
        edgeLog('rally_join_channel', { channelName });
      }
    });

    channelRef.current = ch;

    return () => { 
      ch.unsubscribe(); 
      channelRef.current = null; 
    };
  }, [channelName]);

  async function broadcast(evt: RallyEvent) {
    if (!channelRef.current) return;
    await channelRef.current.send({ 
      type: 'broadcast', 
      event: 'rally_evt', 
      payload: evt 
    });
  }

  return {
    members,
    async create(meta?: any) {
      const rallyIdNew = crypto.randomUUID();
      const evt: RallyEvent = { 
        type: 'rally_created', 
        rallyId: rallyIdNew, 
        host: 'self', 
        ts: Date.now(), 
        meta 
      };
      
      await supabase.channel(`rally:${rallyIdNew}`).subscribe();
      await broadcast(evt);
      return rallyIdNew;
    },
    async join(userId: string) {
      await channelRef.current?.track({ user_id: userId });
      await broadcast({ 
        type: 'rally_joined', 
        rallyId: rallyId!, 
        userId, 
        ts: Date.now() 
      });
    },
    async leave(userId: string) {
      await broadcast({ 
        type: 'rally_left', 
        rallyId: rallyId!, 
        userId, 
        ts: Date.now() 
      });
      await channelRef.current?.untrack();
    },
    async stop(host: string) {
      await broadcast({ 
        type: 'rally_stopped', 
        rallyId: rallyId!, 
        host, 
        ts: Date.now() 
      });
    },
    async ping(userId: string, etaBand?: string) {
      // Use privacy gate to avoid precise sharing; send ETA band only
      const res = await withGate(
        async () => true, 
        { envelopeId: 'strict', epsilonCost: 0 }
      );
      if (!res.ok) return;
      
      await broadcast({ 
        type: 'rally_ping', 
        rallyId: rallyId!, 
        userId, 
        ts: Date.now(), 
        etaBand 
      });
    }
  };
}