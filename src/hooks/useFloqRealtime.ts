import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface RealtimeEvent {
  type: 'message' | 'presence' | 'activity' | 'location' | 'vibe' | 'typing' | 'reaction' | 'join' | 'leave';
  data: any;
  timestamp: Date;
  profileId: string;
}

export interface RealtimeStats {
  connectedUsers: number;
  activeChannels: number;
  messageRate: number; // messages per minute
  latency: number; // ms
  uptime: number; // seconds
  lastEvent: Date;
}

export interface OptimizedMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  reactions: Record<string, string[]>; // userId -> emoji[]
  reply_to_id?: string;
  thread_count: number;
  isOptimistic: boolean;
}

export function useFloqRealtime(floqId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [stats, setStats] = useState<RealtimeStats>({
    connectedUsers: 0,
    activeChannels: 0,
    messageRate: 0,
    latency: 0,
    uptime: 0,
    lastEvent: new Date()
  });
  const [optimisticMessages, setOptimisticMessages] = useState<OptimizedMessage[]>([]);
  const [messageQueue, setMessageQueue] = useState<OptimizedMessage[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);
  const lastPing = useRef<number>(Date.now());
  const messageRateRef = useRef<number[]>([]);
  const channelRef = useRef<any>(null);

  // Connection quality monitoring
  const monitorConnectionQuality = useCallback(() => {
    const now = Date.now();
    const latency = now - lastPing.current;
    
    if (latency < 100) setConnectionQuality('excellent');
    else if (latency < 300) setConnectionQuality('good');
    else if (latency < 1000) setConnectionQuality('fair');
    else setConnectionQuality('poor');
    
    setStats(prev => ({
      ...prev,
      latency,
      lastEvent: new Date()
    }));
  }, []);

  // Message rate calculation
  const updateMessageRate = useCallback(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old messages from rate calculation
    messageRateRef.current = messageRateRef.current.filter(timestamp => timestamp > oneMinuteAgo);
    
    setStats(prev => ({
      ...prev,
      messageRate: messageRateRef.current.length
    }));
  }, []);

  // Optimistic message handling
  const addOptimisticMessage = useCallback((message: Omit<OptimizedMessage, 'id' | 'isOptimistic'>) => {
    const optimisticMessage: OptimizedMessage = {
      ...message,
      id: `optimistic-${Date.now()}-${Math.random()}`,
      isOptimistic: true
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    
    // Remove optimistic message after 5 seconds if not confirmed
    setTimeout(() => {
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }, 5000);
  }, []);

  // Message queue management
  const addToMessageQueue = useCallback((message: OptimizedMessage) => {
    setMessageQueue(prev => [...prev, message]);
  }, []);

  const processMessageQueue = useCallback(async () => {
    if (messageQueue.length === 0 || !isConnected) return;
    
    const message = messageQueue[0];
    try {
      await supabase
        .from('floq_messages')
        .insert({
          floq_id: floqId,
          sender_id: message.sender_id,
          content: message.content,
          reply_to_id: message.reply_to_id
        });
      
      // Remove from queue and optimistic messages
      setMessageQueue(prev => prev.slice(1));
      setOptimisticMessages(prev => prev.filter(m => m.id !== message.id));
      
      // Update message rate
      messageRateRef.current.push(Date.now());
      updateMessageRate();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Message failed to send",
        description: "Your message will be retried automatically.",
        variant: "destructive"
      });
    }
  }, [messageQueue, isConnected, floqId, updateMessageRate, toast]);

  // Advanced reconnection logic
  const reconnect = useCallback(async () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      toast({
        title: "Connection failed",
        description: "Unable to reconnect. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    
    setIsReconnecting(true);
    reconnectAttempts.current++;
    
    try {
      await channelRef.current?.unsubscribe();
      await initializeRealtime();
      reconnectAttempts.current = 0;
      reconnectDelay.current = 1000;
    } catch (error) {
      console.error('Reconnection failed:', error);
      setTimeout(() => {
        reconnectDelay.current *= 2;
        reconnect();
      }, reconnectDelay.current);
    } finally {
      setIsReconnecting(false);
    }
  }, [toast]);

  // Initialize real-time connection
  const initializeRealtime = useCallback(async () => {
    if (!user || !floqId) return;
    
    try {
      const channel = supabase.channel(`floq-realtime-${floqId}`, {
        config: {
          presence: {
            key: user.id,
          },
          broadcast: {
            self: true,
          },
        },
      });

      // Subscribe to presence updates
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          setStats(prev => ({
            ...prev,
            connectedUsers: Object.keys(presenceState).length
          }));
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        });

      // Subscribe to message broadcasts
      channel
        .on('broadcast', { event: 'message' }, (payload) => {
          const { message, sender_id } = payload;
          addToMessageQueue({
            id: message.id,
            content: message.content,
            sender_id,
            created_at: new Date().toISOString(),
            reactions: {},
            reply_to_id: message.reply_to_id,
            thread_count: 0,
            isOptimistic: false
          });
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          // Handle typing indicators
        })
        .on('broadcast', { event: 'reaction' }, (payload) => {
          // Handle message reactions
        })
        .on('broadcast', { event: 'vibe_change' }, (payload) => {
          // Handle vibe changes
        });

      // Subscribe to database changes
      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_messages',
          filter: `floq_id=eq.${floqId}`
        }, (payload) => {
          const message = payload.new as OptimizedMessage;
          addToMessageQueue(message);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'floq_messages',
          filter: `floq_id=eq.${floqId}`
        }, (payload) => {
          // Handle message updates (reactions, edits, etc.)
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_activity',
          filter: `floq_id=eq.${floqId}`
        }, (payload) => {
          // Handle activity updates
        });

      // Track connection status
      channel
        .on('system', { event: 'disconnect' }, () => {
          setIsConnected(false);
          reconnect();
        })
        .on('system', { event: 'reconnect' }, () => {
          setIsConnected(true);
          setIsReconnecting(false);
        });

      // Subscribe to the channel
      const status = await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setStats(prev => ({
            ...prev,
            activeChannels: 1,
            uptime: 0
          }));
          
          // Track uptime
          const uptimeInterval = setInterval(() => {
            setStats(prev => ({
              ...prev,
              uptime: prev.uptime + 1
            }));
          }, 1000);
          
          // Monitor connection quality
          const qualityInterval = setInterval(() => {
            lastPing.current = Date.now();
            monitorConnectionQuality();
          }, 5000);
          
          return () => {
            clearInterval(uptimeInterval);
            clearInterval(qualityInterval);
          };
        }
      });

      channelRef.current = channel;
      
    } catch (error) {
      console.error('Failed to initialize realtime:', error);
      toast({
        title: "Connection failed",
        description: "Unable to connect to real-time features.",
        variant: "destructive"
      });
    }
  }, [user, floqId, addToMessageQueue, reconnect, monitorConnectionQuality, toast]);

  // Send message with optimistic updates
  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!user) return;
    
    const optimisticMessage: Omit<OptimizedMessage, 'id' | 'isOptimistic'> = {
      content,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      reactions: {},
      reply_to_id: replyToId,
      thread_count: 0
    };
    
    addOptimisticMessage(optimisticMessage);
    
    // Add to queue for processing
    addToMessageQueue({
      ...optimisticMessage,
      id: `queue-${Date.now()}-${Math.random()}`,
      isOptimistic: false
    });
  }, [user, addOptimisticMessage, addToMessageQueue]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!user || !isConnected) return;
    
    try {
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          profileId: user.id,
          isTyping,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [user, isConnected]);

  // Send reaction
  const sendReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user || !isConnected) return;
    
    try {
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
          messageId,
          profileId: user.id,
          emoji,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  }, [user, isConnected]);

  // Update presence
  const updatePresence = useCallback(async (presence: any) => {
    if (!user || !isConnected) return;
    
    try {
      await channelRef.current?.track(presence);
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, [user, isConnected]);

  // Initialize on mount
  useEffect(() => {
    initializeRealtime();
    
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [initializeRealtime]);

  // Process message queue
  useEffect(() => {
    if (messageQueue.length > 0 && isConnected) {
      const interval = setInterval(processMessageQueue, 1000);
      return () => clearInterval(interval);
    }
  }, [messageQueue, isConnected, processMessageQueue]);

  // Update message rate periodically
  useEffect(() => {
    const interval = setInterval(updateMessageRate, 60000);
    return () => clearInterval(interval);
  }, [updateMessageRate]);

  return {
    // State
    isConnected,
    isReconnecting,
    connectionQuality,
    stats,
    optimisticMessages,
    messageQueue,
    
    // Actions
    sendMessage,
    sendTypingIndicator,
    sendReaction,
    updatePresence,
    
    // Utilities
    getConnectionStatus: () => ({
      connected: isConnected,
      reconnecting: isReconnecting,
      quality: connectionQuality,
      stats
    }),
    
    // Performance metrics
    getPerformanceMetrics: () => ({
      latency: stats.latency,
      messageRate: stats.messageRate,
      uptime: stats.uptime,
      connectedUsers: stats.connectedUsers
    })
  };
} 