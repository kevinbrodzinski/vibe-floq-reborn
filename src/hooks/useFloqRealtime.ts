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

  const [connectionState, setConnectionState] = useState<{
    isConnected: boolean;
    isReconnecting: boolean;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  }>({
    isConnected: true,
    isReconnecting: false,
    quality: 'excellent'
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

  // Simulate dynamic connection quality and stats
  const stats = {
    messages: realtimeData.recent_activity.length,
    latency: Math.floor(Math.random() * 50) + 20, // 20-70ms
    connectedUsers: realtimeData.member_count,
    uptime: Math.floor(Date.now() / 1000) % 86400, // seconds since midnight
    activeChannels: 1
  };

  const getPerformanceMetrics = () => ({
    cpu: Math.floor(Math.random() * 20) + 30, // 30-50%
    memory: Math.floor(Math.random() * 30) + 40, // 40-70%
    fps: 60,
    latency: stats.latency,
    messageRate: Math.floor(Math.random() * 10) + 5, // 5-15 msg/min
    uptime: stats.uptime,
    connectedUsers: stats.connectedUsers
  });

  return {
    realtimeData,
    isConnected: connectionState.isConnected,
    isReconnecting: connectionState.isReconnecting,
    connectionQuality: connectionState.quality,
    stats,
    getPerformanceMetrics
  };
}