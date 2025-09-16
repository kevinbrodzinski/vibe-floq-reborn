import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FloqRealtimeData {
  member_count: number;
  energy_now: number;
  recent_activity: Array<{
    type: 'join' | 'leave' | 'message' | 'decision';
    profile_id: string;
    timestamp: string;
    metadata?: any;
  }>;
}

export function useFloqRealtime(floqId: string) {
  const [realtimeData, setRealtimeData] = useState<FloqRealtimeData>({
    member_count: 0,
    energy_now: 0.5,
    recent_activity: []
  });

  useEffect(() => {
    if (!floqId) return;

    // Subscribe to floq-specific updates
    const channel = supabase
      .channel(`floq:${floqId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'floq_participants',
        filter: `floq_id=eq.${floqId}`
      }, (payload) => {
        setRealtimeData(prev => ({
          ...prev,
          member_count: prev.member_count + 1,
          recent_activity: [{
            type: 'join' as const,
            profile_id: payload.new.profile_id as string,
            timestamp: new Date().toISOString()
          }, ...prev.recent_activity].slice(0, 10)
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId]);

  return {
    realtimeData,
    isConnected: true,
    isReconnecting: false,
    connectionQuality: 'excellent' as const,
    stats: { messages: 0, latency: 0 },
    getPerformanceMetrics: () => ({ cpu: 0, memory: 0, fps: 60 })
  };
}