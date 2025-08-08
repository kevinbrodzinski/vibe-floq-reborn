import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { realtimeManager } from '@/lib/realtime/manager';
import { createSafeRealtimeHandler } from '@/lib/realtime/validation';
import { useEffect, useRef } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { toast } from "sonner";

export interface DirectThreadWithProfiles {
  id: string;
  member_a: string;
  member_b: string;
  member_a_profile_id: string;
  member_b_profile_id: string;
  created_at: string;
  last_message_at: string | null;
  last_read_at_a: string | null;
  last_read_at_b: string | null;
  unread_a: number;
  unread_b: number;
  member_a_profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  member_b_profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  // Computed fields for easier access
  otherProfileId: string;
  unreadCount: number;
  lastReadAt: string | null;
}

export interface ThreadSummary {
  id: string;
  friendProfile: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
    isFromMe: boolean;
  } | null;
  unreadCount: number;
  lastMessageAt: string | null;
  isOnline?: boolean;
}

// Global subscription tracking to prevent conflicts
const globalSubscriptionTracking = new Map<string, number>();

export function useThreads() {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();
  const queryKey = ['dm-threads', currentUserId];
  const subscriptionAttempts = useRef(0);
  const maxSubscriptionAttempts = 3;

  // Fetch all threads for current user
  const { data: threads = [], isLoading, error } = useQuery({
    queryKey,
    enabled: !!currentUserId,
    queryFn: async (): Promise<DirectThreadWithProfiles[]> => {
      try {
        // First get threads without joins to avoid foreign key issues
        const { data: threadsData, error } = await supabase
          .from("direct_threads")
          .select('*')
          .or(`member_a_profile_id.eq.${currentUserId},member_b_profile_id.eq.${currentUserId}`)
          .order('last_message_at', { ascending: false, nullsLast: true });

        if (error) {
          // Handle case where database table doesn't exist yet
          if (error.code === 'PGRST116' || error.message?.includes('direct_threads')) {
            console.warn('[useThreads] Database table not found - returning empty threads');
            return [];
          }
          throw error;
        }

        if (!threadsData || threadsData.length === 0) {
          return [];
        }

        // Then get profile data separately
        const profileIds = new Set<string>();
        threadsData?.forEach(thread => {
          if (thread.member_a_profile_id) profileIds.add(thread.member_a_profile_id);
          if (thread.member_b_profile_id) profileIds.add(thread.member_b_profile_id);
        });

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', Array.from(profileIds));

        // Combine the data
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const combinedData = threadsData?.map(thread => ({
          ...thread,
          member_a_profile: profilesMap.get(thread.member_a_profile_id) || null,
          member_b_profile: profilesMap.get(thread.member_b_profile_id) || null,
        })) || [];

        return combinedData.map(thread => {
          const isMemberA = thread.member_a_profile_id === currentUserId;
          return {
            ...thread,
            otherProfileId: isMemberA ? thread.member_b_profile_id : thread.member_a_profile_id,
            unreadCount: isMemberA ? thread.unread_a : thread.unread_b,
            lastReadAt: isMemberA ? thread.last_read_at_a : thread.last_read_at_b,
          };
        }) as DirectThreadWithProfiles[];
      } catch (error) {
        console.error('[useThreads] Query error:', error);
        // Return empty array instead of throwing to prevent page freezing
        return [];
      }
    },
    staleTime: 30_000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry if it's a schema/table issue
      if (error?.code === 'PGRST116' || error?.message?.includes('direct_threads')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Real-time subscription for thread updates - with enhanced error handling
  useEffect(() => {
    if (!currentUserId) return;

    // Prevent excessive subscription attempts
    const subscriptionKey = `threads:${currentUserId}`;
    const currentAttempts = globalSubscriptionTracking.get(subscriptionKey) || 0;
    
    if (currentAttempts >= maxSubscriptionAttempts) {
      console.warn(`[useThreads] Max subscription attempts reached for ${subscriptionKey}, skipping realtime`);
      return;
    }

    // Track this attempt
    globalSubscriptionTracking.set(subscriptionKey, currentAttempts + 1);
    subscriptionAttempts.current = currentAttempts + 1;

    // Generate a unique hook ID to prevent conflicts between multiple useThreads instances
    const hookId = `threads-hook-${currentUserId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let cleanup: (() => void) | null = null;
    let subscriptionTimer: NodeJS.Timeout | null = null;

    const setupSubscription = async () => {
      try {
        cleanup = realtimeManager.subscribe(
          subscriptionKey,
          `dm_threads_${currentUserId}`,
          (channel) =>
            channel
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'direct_threads',
                  filter: `member_a_profile_id=eq.${currentUserId}`,
                },
                createSafeRealtimeHandler<Database["public"]["Tables"]["direct_threads"]["Row"]>(
                  ({ eventType, new: newThread, old: oldThread }) => {
                    console.log('📨 Thread update (member_a):', { eventType, newThread, oldThread });
                    
                    // Debounce invalidation to prevent excessive refetching
                    if (subscriptionTimer) {
                      clearTimeout(subscriptionTimer);
                    }
                    subscriptionTimer = setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ['dm-threads', currentUserId] });
                    }, 500);
                  },
                  (error, payload) => {
                    console.error('[useThreads] Realtime error (member_a):', error, payload);
                    // Don't throw error to prevent page freezing
                  }
                )
              )
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'direct_threads',
                  filter: `member_b_profile_id=eq.${currentUserId}`,
                },
                createSafeRealtimeHandler<Database["public"]["Tables"]["direct_threads"]["Row"]>(
                  ({ eventType, new: newThread, old: oldThread }) => {
                    console.log('📨 Thread update (member_b):', { eventType, newThread, oldThread });
                    
                    // Debounce invalidation to prevent excessive refetching
                    if (subscriptionTimer) {
                      clearTimeout(subscriptionTimer);
                    }
                    subscriptionTimer = setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ['dm-threads', currentUserId] });
                    }, 500);
                  },
                  (error, payload) => {
                    console.error('[useThreads] Realtime error (member_b):', error, payload);
                    // Don't throw error to prevent page freezing
                  }
                )
              ),
          hookId
        );
      } catch (error) {
        console.error('[useThreads] Subscription setup error:', error);
        // Don't throw error to prevent page freezing
      }
    };

    // Setup subscription with error handling
    setupSubscription();

    return () => {
      try {
        // Clear debounce timer
        if (subscriptionTimer) {
          clearTimeout(subscriptionTimer);
        }
        
        // Cleanup subscription
        if (cleanup) {
          cleanup();
        }
        
        // Reset attempt counter on successful cleanup
        const attempts = globalSubscriptionTracking.get(subscriptionKey) || 0;
        if (attempts > 0) {
          globalSubscriptionTracking.set(subscriptionKey, Math.max(0, attempts - 1));
        }
      } catch (error) {
        console.error('[useThreads] Cleanup error:', error);
        // Don't throw error during cleanup
      }
    };
  }, [currentUserId, queryClient]);

  // Create or get existing thread using enhanced function
  const createThread = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');

      const { data: threadId, error } = await supabase.rpc('create_or_get_thread', {
        p_user_a: currentUserId,
        p_user_b: otherUserId,
      });

      if (error) {
        // Handle case where database function doesn't exist yet
        if (error.code === 'PGRST202' || error.message?.includes('create_or_get_thread')) {
          console.warn('[useThreads] Database function not found - P2P migrations may not be applied yet');
          throw new Error('Thread creation not available yet - please apply P2P migrations');
        }
        throw error;
      }
      return threadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Failed to create thread:', error);
      toast.error('Failed to create conversation', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Mark thread as read using enhanced function
  const markThreadRead = useMutation({
    mutationFn: async (threadId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('mark_thread_read_enhanced', {
        p_thread_id: threadId,
        p_profile_id: currentUserId,
      });

      if (error) {
        // Handle case where database function doesn't exist yet
        if (error.code === 'PGRST202' || error.message?.includes('mark_thread_read_enhanced')) {
          console.warn('[useThreads] Database function not found - P2P migrations may not be applied yet');
          throw new Error('Mark thread read not available yet - please apply P2P migrations');
        }
        throw error;
      }
    },
    onSuccess: (_, threadId) => {
      // Optimistically update unread counts
      queryClient.setQueryData(queryKey, (oldData: DirectThreadWithProfiles[] = []) => {
        return oldData.map(thread => {
          if (thread.id === threadId) {
            const isMemberA = thread.member_a_profile_id === currentUserId;
            return {
              ...thread,
              unread_a: isMemberA ? 0 : thread.unread_a,
              unread_b: !isMemberA ? 0 : thread.unread_b,
              last_read_at_a: isMemberA ? new Date().toISOString() : thread.last_read_at_a,
              last_read_at_b: !isMemberA ? new Date().toISOString() : thread.last_read_at_b,
            };
          }
          return thread;
        });
      });
    },
    onError: (error) => {
      console.error('Failed to mark thread as read:', error);
      toast.error('Failed to mark as read', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Process threads into summary format
  const threadSummaries: ThreadSummary[] = useMemo(() => {
    return threads.map(thread => {
      const isMemberA = thread.member_a_profile_id === currentUserId;
      const friendProfile = isMemberA ? thread.member_b_profile : thread.member_a_profile;
      const friendId = isMemberA ? thread.member_b_profile_id : thread.member_a_profile_id;
      const unreadCount = isMemberA ? (thread.unread_a || 0) : (thread.unread_b || 0);

      return {
        id: thread.id,
        friendProfile: {
          id: friendId,
          display_name: friendProfile?.display_name || null,
          username: friendProfile?.username || null,
          avatar_url: friendProfile?.avatar_url || null,
        },
        lastMessage: thread.last_message ? {
          content: thread.last_message.content,
          created_at: thread.last_message.created_at,
          isFromMe: thread.last_message.profile_id === currentUserId,
        } : null,
        unreadCount,
        lastMessageAt: thread.last_message_at,
      };
    });
  }, [threads, currentUserId]);

  // Search threads using enhanced function
  const searchThreads = async (query: string): Promise<ThreadSummary[]> => {
    if (!query.trim() || query.length < 2 || !currentUserId) return [];

    try {
      const { data, error } = await supabase.rpc('search_direct_threads_enhanced', { 
        p_profile_id: currentUserId,
        p_query: query,
        p_limit: 20
      });
      if (error) {
        // Handle case where database function doesn't exist yet
        if (error.code === 'PGRST202' || error.message?.includes('search_direct_threads_enhanced')) {
          console.warn('[useThreads] Search function not found - P2P migrations may not be applied yet');
          return [];
        }
        // Handle function signature mismatch (type issues)
        if (error.code === '42804' || error.message?.includes('structure of query does not match function result type')) {
          console.warn('[useThreads] Function signature mismatch - please apply the latest migration to fix data types');
          return [];
        }
        throw error;
      }
      
      return data?.map((result: any) => ({
        id: result.thread_id,
        friendProfile: {
          id: result.other_profile_id,
          display_name: result.other_display_name,
          username: result.other_username,
          avatar_url: result.other_avatar_url,
        },
        lastMessage: result.last_message_content ? {
          content: result.last_message_content,
          created_at: result.last_message_at,
          isFromMe: false, // Search results don't indicate sender
        } : null,
        unreadCount: result.unread_count || 0,
        lastMessageAt: result.last_message_at,
        isOnline: result.is_online || false,
      })) || [];
    } catch (error) {
      console.error('Thread search error:', error);
      return [];
    }
  };

  return {
    threads: threadSummaries,
    isLoading,
    error,
    createThread: createThread.mutate,
    isCreatingThread: createThread.isPending,
    markThreadRead: markThreadRead.mutate,
    isMarkingRead: markThreadRead.isPending,
    searchThreads,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}