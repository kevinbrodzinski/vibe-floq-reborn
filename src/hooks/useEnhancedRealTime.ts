import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ConnectionHealth {
  isConnected: boolean;
  lastPing: Date | null;
  reconnectAttempts: number;
  latency: number | null;
}

interface EnhancedRealTimeOptions {
  enablePresence?: boolean;
  enableTypingIndicators?: boolean;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
}

export function useEnhancedRealTime(
  channelName: string,
  options: EnhancedRealTimeOptions = {}
) {
  const {
    enablePresence = false,
    enableTypingIndicators = false,
    heartbeatInterval = 30000,
    maxReconnectAttempts = 5
  } = options;

  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    isConnected: false,
    lastPing: null,
    reconnectAttempts: 0,
    latency: null
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingStartRef = useRef<number | null>(null);
  const presenceDataRef = useRef<any>(null); // Cache presence data

  // Connection health monitoring
  const startHealthMonitoring = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      if (channelRef.current) {
        pingStartRef.current = Date.now();
        
        // Send a ping and measure latency
        channelRef.current.send({
          type: 'broadcast',
          event: 'ping',
          payload: { timestamp: Date.now() }
        });
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // Enhanced connection management
  const setupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: enablePresence ? { key: 'user' } : undefined,
        broadcast: { self: true }
      }
    });

    // Connection status tracking
    channel.subscribe((status) => {
      setConnectionHealth(prev => ({
        ...prev,
        isConnected: status === 'SUBSCRIBED',
        reconnectAttempts: status === 'SUBSCRIBED' ? 0 : prev.reconnectAttempts + 1
      }));

      if (status === 'SUBSCRIBED') {
        startHealthMonitoring();
      }
    });

    // Ping/pong for latency measurement
    channel.on('broadcast', { event: 'ping' }, () => {
      channel.send({
        type: 'broadcast',
        event: 'pong',
        payload: { timestamp: Date.now() }
      });
    });

    channel.on('broadcast', { event: 'pong' }, () => {
      if (pingStartRef.current) {
        const latency = Date.now() - pingStartRef.current;
        setConnectionHealth(prev => ({
          ...prev,
          latency,
          lastPing: new Date()
        }));
        pingStartRef.current = null;
      }
    });

    channelRef.current = channel;
    return channel;
  }, [channelName, enablePresence, startHealthMonitoring]);

  // Typing indicators
  const broadcastTyping = useCallback((isTyping: boolean, userId?: string) => {
    if (!enableTypingIndicators || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { isTyping, userId, timestamp: Date.now() }
    });
  }, [enableTypingIndicators]);

  // Presence tracking with caching
  const updatePresence = useCallback(async (presenceData: any) => {
    if (!enablePresence || !channelRef.current) return;

    // Only update if presence data actually changed
    if (JSON.stringify(presenceData) === JSON.stringify(presenceDataRef.current)) {
      return;
    }

    presenceDataRef.current = presenceData;
    return channelRef.current.track(presenceData);
  }, [enablePresence]);

  // Initialize channel
  useEffect(() => {
    const channel = setupChannel();
    
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [setupChannel]);

  // Reconnection logic
  useEffect(() => {
    if (!connectionHealth.isConnected && 
        connectionHealth.reconnectAttempts > 0 && 
        connectionHealth.reconnectAttempts < maxReconnectAttempts) {
      
      const timeout = setTimeout(() => {
        setupChannel();
      }, Math.min(1000 * Math.pow(2, connectionHealth.reconnectAttempts), 30000));

      return () => clearTimeout(timeout);
    }
  }, [connectionHealth.isConnected, connectionHealth.reconnectAttempts, maxReconnectAttempts, setupChannel]);

  // Connection status indicators
  const isUnstable = useMemo(() => 
    connectionHealth.reconnectAttempts > 2 || 
    (connectionHealth.latency && connectionHealth.latency > 2000),
    [connectionHealth.reconnectAttempts, connectionHealth.latency]
  );

  return {
    channel: channelRef.current,
    connectionHealth,
    isUnstable,
    broadcastTyping,
    updatePresence,
    reconnect: setupChannel
  };
}