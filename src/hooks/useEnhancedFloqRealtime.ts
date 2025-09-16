import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FloqRealtimeData {
  member_count: number;
  energy_now: number;
  recent_activity: Array<{
    type: 'join' | 'leave' | 'message' | 'decision' | 'vibe_change';
    profile_id: string;
    display_name?: string;
    timestamp: string;
    metadata?: {
      previous_vibe?: string;
      new_vibe?: string;
      message_preview?: string;
      decision_type?: string;
    };
  }>;
  member_profiles: Array<{
    profile_id: string;
    display_name?: string;
    avatar_url?: string;
    online_status: 'online' | 'away' | 'offline';
    current_vibe?: string;
    joined_at: string;
  }>;
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  lastHeartbeat?: number;
}

export function useEnhancedFloqRealtime(floqId: string) {
  const { user } = useAuth();
  const [realtimeData, setRealtimeData] = useState<FloqRealtimeData>({
    member_count: 0,
    energy_now: 0.5,
    recent_activity: [],
    member_profiles: []
  });

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    quality: 'excellent'
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activityBuffer = useRef<FloqRealtimeData['recent_activity']>([]);
  const memberCache = useRef<Map<string, any>>(new Map());

  // Initialize real-time subscriptions
  useEffect(() => {
    if (!floqId || !user) return;

    console.log('[EnhancedFloqRealtime] Setting up real-time subscriptions for floq:', floqId);

    const channel = supabase
      .channel(`enhanced_floq:${floqId}`)
      
      // Member join/leave tracking
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'floq_participants',
        filter: `floq_id=eq.${floqId}`
      }, async (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const profileId = (newRecord as any)?.profile_id || (oldRecord as any)?.profile_id;
        
        if (!profileId) return;

        // Fetch profile info if not cached
        let profileInfo = memberCache.current.get(profileId);
        if (!profileInfo && newRecord) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('profile_id', profileId)
            .single();
          
          profileInfo = profile;
          memberCache.current.set(profileId, profileInfo);
        }

        const activity = {
          type: eventType === 'INSERT' ? 'join' as const : 'leave' as const,
          profile_id: profileId,
          display_name: profileInfo?.display_name || 'Unknown',
          timestamp: new Date().toISOString(),
          metadata: {}
        };

        setRealtimeData(prev => ({
          ...prev,
          member_count: eventType === 'INSERT' 
            ? prev.member_count + 1 
            : Math.max(0, prev.member_count - 1),
          recent_activity: [activity, ...prev.recent_activity].slice(0, 20),
          member_profiles: eventType === 'INSERT'
            ? [...prev.member_profiles, {
                profile_id: profileId,
                display_name: profileInfo?.display_name,
                avatar_url: profileInfo?.avatar_url,
                online_status: 'online' as const,
                joined_at: newRecord.joined_at || new Date().toISOString()
              }]
            : prev.member_profiles.filter(p => p.profile_id !== profileId)
        }));
      })

      // Chat message activity
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${floqId}`
      }, async (payload) => {
        const message = payload.new;
        if (!message) return;

        // Get sender profile info
        let profileInfo = memberCache.current.get(message.sender_id);
        if (!profileInfo) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('profile_id', message.sender_id)
            .single();
          
          profileInfo = profile;
          memberCache.current.set(message.sender_id, profileInfo);
        }

        const activity = {
          type: 'message' as const,
          profile_id: message.sender_id,
          display_name: profileInfo?.display_name || 'Someone',
          timestamp: message.created_at,
          metadata: {
            message_preview: message.body?.substring(0, 50) + (message.body?.length > 50 ? '...' : '')
          }
        };

        setRealtimeData(prev => ({
          ...prev,
          recent_activity: [activity, ...prev.recent_activity].slice(0, 20),
          energy_now: Math.min(1, prev.energy_now + 0.05) // Slight energy boost from activity
        }));
      })

      // User vibe state changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_vibe_states'
      }, async (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const profileId = (newRecord as any)?.profile_id || (oldRecord as any)?.profile_id;
        
        if (!profileId) return;

        // Check if this user is in our floq
        const isMember = realtimeData.member_profiles.some(m => m.profile_id === profileId);
        if (!isMember) return;

        if (eventType === 'UPDATE' && newRecord && oldRecord) {
          const activity = {
            type: 'vibe_change' as const,
            profile_id: profileId,
            display_name: memberCache.current.get(profileId)?.display_name || 'Someone',
            timestamp: new Date().toISOString(),
            metadata: {
              previous_vibe: oldRecord.vibe,
              new_vibe: newRecord.vibe
            }
          };

          setRealtimeData(prev => ({
            ...prev,
            recent_activity: [activity, ...prev.recent_activity].slice(0, 20),
            member_profiles: prev.member_profiles.map(p => 
              p.profile_id === profileId 
                ? { ...p, current_vibe: newRecord.vibe }
                : p
            )
          }));
        }
      })

      .subscribe((status) => {
        console.log('[EnhancedFloqRealtime] Channel status:', status);
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
          isReconnecting: status === 'CHANNEL_ERROR',
          quality: status === 'SUBSCRIBED' ? 'excellent' : 
                   status === 'CHANNEL_ERROR' ? 'poor' : 'fair',
          lastHeartbeat: Date.now()
        }));
      });

    channelRef.current = channel;

    // Initial data fetch
    loadInitialData();

    return () => {
      console.log('[EnhancedFloqRealtime] Cleaning up subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [floqId, user]);

  // Load initial member data
  const loadInitialData = async () => {
    if (!floqId) return;

    try {
      const { data: participants } = await supabase
        .from('floq_participants')
        .select(`
          profile_id,
          joined_at,
          profiles!inner(display_name, avatar_url)
        `)
        .eq('floq_id', floqId);

      if (participants) {
        const memberProfiles = participants.map((p: any) => ({
          profile_id: p.profile_id,
          display_name: p.profiles?.display_name,
          avatar_url: p.profiles?.avatar_url,
          online_status: 'online' as const, // TODO: Get real presence data
          joined_at: p.joined_at
        }));

        setRealtimeData(prev => ({
          ...prev,
          member_count: participants.length,
          member_profiles: memberProfiles
        }));

        // Cache profile data
        participants.forEach((p: any) => {
          memberCache.current.set(p.profile_id, p.profiles);
        });
      }
    } catch (error) {
      console.error('[EnhancedFloqRealtime] Failed to load initial data:', error);
    }
  };

  // Performance and connection metrics
  const stats = {
    messages: realtimeData.recent_activity.filter(a => a.type === 'message').length,
    latency: Math.floor(Math.random() * 50) + 20, // TODO: Calculate real latency
    connectedUsers: realtimeData.member_count,
    uptime: connectionState.lastHeartbeat ? 
      Math.floor((Date.now() - connectionState.lastHeartbeat) / 1000) : 0,
    activeChannels: channelRef.current ? 1 : 0
  };

  const getPerformanceMetrics = () => ({
    cpu: Math.floor(Math.random() * 20) + 30,
    memory: Math.floor(Math.random() * 30) + 40,
    fps: 60,
    latency: stats.latency,
    messageRate: realtimeData.recent_activity.filter(a => 
      a.type === 'message' && 
      Date.now() - new Date(a.timestamp).getTime() < 60000
    ).length,
    uptime: stats.uptime,
    connectedUsers: stats.connectedUsers
  });

  return {
    realtimeData,
    isConnected: connectionState.isConnected,
    isReconnecting: connectionState.isReconnecting,
    connectionQuality: connectionState.quality,
    stats,
    getPerformanceMetrics,
    
    // Additional utilities
    getMemberProfile: (profileId: string) => 
      realtimeData.member_profiles.find(p => p.profile_id === profileId),
    getRecentActivity: (type?: string) => 
      type ? realtimeData.recent_activity.filter(a => a.type === type) 
           : realtimeData.recent_activity,
    isUserOnline: (profileId: string) => 
      realtimeData.member_profiles.find(p => p.profile_id === profileId)?.online_status === 'online'
  };
}