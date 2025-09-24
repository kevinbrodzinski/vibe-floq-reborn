import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdvancedHaptics } from './useAdvancedHaptics';

interface FloqRealtimeData {
  id: string;
  participants?: number;
  energy_now?: number;
  friends_in?: number;
  status?: 'live' | 'upcoming' | 'ended';
}

interface RealtimeUpdateEvent {
  type: 'member_joined' | 'member_left' | 'energy_changed' | 'status_changed';
  floqId: string;
  data: Partial<FloqRealtimeData>;
  timestamp: number;
}

export function useRealtimeFloqUpdates(floqIds: string[]) {
  const [updates, setUpdates] = useState<Map<string, FloqRealtimeData>>(new Map());
  const [recentEvents, setRecentEvents] = useState<RealtimeUpdateEvent[]>([]);
  const { light, success, warning } = useAdvancedHaptics();

  const handleUpdate = useCallback((event: RealtimeUpdateEvent) => {
    // Update the data map
    setUpdates(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(event.floqId) || { id: event.floqId };
      newMap.set(event.floqId, { ...existing, ...event.data });
      return newMap;
    });

    // Add to recent events
    setRecentEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events

    // Haptic feedback for different event types
    switch (event.type) {
      case 'member_joined':
        success();
        break;
      case 'member_left':
        warning();
        break;
      case 'energy_changed':
        if (event.data.energy_now && event.data.energy_now > 0.7) {
          light();
        }
        break;
    }
  }, [success, warning, light]);

  useEffect(() => {
    if (floqIds.length === 0) return;

    // Subscribe to floq participants changes
    const participantsChannel = supabase
      .channel('floq-participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_participants',
          filter: `floq_id=in.(${floqIds.join(',')})`
        },
        (payload) => {
          const floqId = (payload.new as any)?.floq_id || (payload.old as any)?.floq_id;
          if (!floqId) return;

          const eventType = payload.eventType === 'INSERT' ? 'member_joined' : 'member_left';
          handleUpdate({
            type: eventType,
            floqId,
            data: { id: floqId },
            timestamp: Date.now()
          });
        }
      )
      .subscribe();

    // Subscribe to venue presence updates (for energy calculations)
    const presenceChannel = supabase
      .channel('venue-presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vibes_now'
        },
        (payload) => {
          // Simulate energy changes based on presence updates
          // In a real app, this would be calculated server-side
          const mockEnergyChange = Math.random() * 0.1;
          const randomFloqId = floqIds[Math.floor(Math.random() * floqIds.length)];
          
          if (randomFloqId && Math.random() > 0.7) { // 30% chance of triggering
            handleUpdate({
              type: 'energy_changed',
              floqId: randomFloqId,
              data: { 
                id: randomFloqId,
                energy_now: Math.max(0.1, Math.min(1, 0.5 + mockEnergyChange))
              },
              timestamp: Date.now()
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [floqIds, handleUpdate]);

  const getFloqData = useCallback((floqId: string): FloqRealtimeData | null => {
    return updates.get(floqId) || null;
  }, [updates]);

  const getRecentEventsForFloq = useCallback((floqId: string): RealtimeUpdateEvent[] => {
    return recentEvents.filter(event => event.floqId === floqId);
  }, [recentEvents]);

  return {
    getFloqData,
    getRecentEventsForFloq,
    recentEvents,
    isConnected: true, // Simplified for demo
    // Helper methods
    hasRecentActivity: (floqId: string) => {
      const events = getRecentEventsForFloq(floqId);
      return events.some(event => Date.now() - event.timestamp < 30000); // Last 30 seconds
    },
    getEnergyTrend: (floqId: string): 'rising' | 'falling' | 'stable' => {
      const events = getRecentEventsForFloq(floqId)
        .filter(e => e.type === 'energy_changed')
        .slice(0, 3);
      
      if (events.length < 2) return 'stable';
      
      const latest = events[0].data.energy_now || 0.5;
      const previous = events[1].data.energy_now || 0.5;
      
      if (latest > previous + 0.1) return 'rising';
      if (latest < previous - 0.1) return 'falling';
      return 'stable';
    }
  };
}