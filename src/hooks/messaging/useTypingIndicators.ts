import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { realtimeManager } from '@/lib/realtime/manager';
import { createSafeRealtimeHandler } from '@/lib/realtime/validation';

interface TypingState {
  userId: string;
  threadId: string;
  isTyping: boolean;
  lastTyped: Date;
}

interface TypingUser {
  userId: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
}

const TYPING_TIMEOUT = 3000; // 3 seconds
const TYPING_DEBOUNCE = 1000; // 1 second debounce for sending typing events

export function useTypingIndicators(threadId: string | undefined, surface: 'dm' | 'floq' | 'plan' = 'dm') {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [isTyping, setIsTyping] = useState(false);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const sendTypingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingEventRef = useRef<number>(0);

  // Real-time subscription for typing events
  useEffect(() => {
    if (!threadId || !currentUserId) return;

    const cleanup = realtimeManager.subscribe(
      `typing:${threadId}`,
      `typing_${surface}_${threadId}`,
      (channel) =>
        channel
          .on(
            'broadcast',
            { event: 'typing' },
            (evt: any) => {
              const payload = (evt && (evt.payload || evt)) as any;
              const { user_id, thread_id, is_typing, display_name, username, avatar_url } = payload || {};
              // Ignore our own typing events
              if (user_id === currentUserId || thread_id !== threadId) return;

              console.log('👀 Typing event:', { user_id, is_typing, display_name });

              setTypingUsers(prev => {
                const newMap = new Map(prev);
                
                if (is_typing) {
                  newMap.set(user_id, {
                    userId: user_id,
                    displayName: display_name,
                    username,
                    avatarUrl: avatar_url,
                  });
                } else {
                  newMap.delete(user_id);
                }
                
                return newMap;
              });

              // Auto-cleanup typing state after timeout
              if (is_typing) {
                setTimeout(() => {
                  setTypingUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(user_id);
                    return newMap;
                  });
                }, TYPING_TIMEOUT);
              }
            }
          ),
      `typing-hook-${threadId}`
    );

    return cleanup;
  }, [threadId, currentUserId, surface]);

  // Send typing event to other users
  const sendTypingEvent = useCallback(async (isTypingNow: boolean) => {
    if (!threadId || !currentUserId) return;

    try {
      // Get current user profile for the typing event
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', currentUserId as any)
        .single();

      await supabase.channel(`typing_${surface}_${threadId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: currentUserId,
            thread_id: threadId,
            is_typing: isTypingNow,
            display_name: (profile as any)?.display_name,
            username: (profile as any)?.username,
            avatar_url: (profile as any)?.avatar_url,
          },
        });
    } catch (error) {
      console.error('Failed to send typing event:', error);
    }
  }, [threadId, currentUserId, surface]);

  // Start typing - called when user starts typing
  const startTyping = useCallback(() => {
    if (!threadId || isTyping) return;

    setIsTyping(true);
    sendTypingEvent(true);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing automatically
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingEvent(false);
    }, TYPING_TIMEOUT);
  }, [threadId, isTyping, sendTypingEvent]);

  // Stop typing - called when user stops typing or sends message
  const stopTyping = useCallback(() => {
    if (!isTyping) return;

    setIsTyping(false);
    sendTypingEvent(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [isTyping, sendTypingEvent]);

  // Debounced typing handler - call this on every keystroke
  const handleTyping = useCallback(() => {
    if (!threadId) return;

    const now = Date.now();
    
    // Start typing if not already typing
    if (!isTyping) {
      startTyping();
    }

    // Debounce rapid typing events
    if (now - lastTypingEventRef.current < TYPING_DEBOUNCE) {
      if (sendTypingTimeoutRef.current) {
        clearTimeout(sendTypingTimeoutRef.current);
      }
    }

    lastTypingEventRef.current = now;

    // Reset the typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  }, [threadId, isTyping, startTyping, stopTyping]);

  // Handle message sent - stop typing immediately
  const handleMessageSent = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (sendTypingTimeoutRef.current) {
        clearTimeout(sendTypingTimeoutRef.current);
      }
      if (isTyping) {
        sendTypingEvent(false);
      }
    };
  }, [isTyping, sendTypingEvent]);

  // Clear typing users when thread changes
  useEffect(() => {
    setTypingUsers(new Map());
    setIsTyping(false);
  }, [threadId]);

  const typingUsersList = Array.from(typingUsers.values());

  return {
    typingUsers: typingUsersList,
    isTyping,
    handleTyping,
    stopTyping,
    handleMessageSent,
    hasTypingUsers: typingUsersList.length > 0,
  };
}

// Helper hook for displaying typing indicator text
export function useTypingIndicatorText(typingUsers: TypingUser[]) {
  if (typingUsers.length === 0) return '';
  
  if (typingUsers.length === 1) {
    const user = typingUsers[0];
    const name = user.displayName || user.username || 'Someone';
    return `${name} is typing...`;
  }
  
  if (typingUsers.length === 2) {
    const names = typingUsers.map(u => u.displayName || u.username || 'Someone');
    return `${names[0]} and ${names[1]} are typing...`;
  }
  
  return `${typingUsers.length} people are typing...`;
}