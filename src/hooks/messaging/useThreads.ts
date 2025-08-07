import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { realtimeManager } from "@/lib/realtime/manager";
import { createSafeRealtimeHandler } from "@/lib/realtime/validation";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type DirectThreadWithProfiles = Database["public"]["Tables"]["direct_threads"]["Row"] & {
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
  last_message?: {
    content: string;
    created_at: string;
    profile_id: string;
  } | null;
};

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

export function useThreads() {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();
  
  const queryKey = ['dm-threads', currentUserId];

  // Fetch all threads for current user
  const { data: threads = [], isLoading, error } = useQuery({
    queryKey,
    enabled: !!currentUserId,
    queryFn: async (): Promise<DirectThreadWithProfiles[]> => {
      const { data, error } = await supabase
        .from("direct_threads")
        .select(`
          *,
          member_a_profile:profiles!direct_threads_member_a_profile_id_fkey(display_name, username, avatar_url),
          member_b_profile:profiles!direct_threads_member_b_profile_id_fkey(display_name, username, avatar_url)
        `)
        .or(`member_a.eq.${currentUserId},member_b.eq.${currentUserId}`)
        .order('last_message_at', { ascending: false, nullsLast: true });

      if (error) throw error;
      return data as DirectThreadWithProfiles[];
    },
    staleTime: 30_000, // 30 seconds
  });

  // Real-time subscription for thread updates
  useEffect(() => {
    if (!currentUserId) return;

    const cleanup = realtimeManager.subscribe(
      `threads:${currentUserId}`,
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
                
                queryClient.setQueryData(queryKey, (oldData: DirectThreadWithProfiles[] = []) => {
                  if (eventType === 'INSERT' && newThread) {
                    // Add new thread (will need to fetch profile data)
                    queryClient.invalidateQueries({ queryKey });
                    return oldData;
                  } else if (eventType === 'UPDATE' && newThread) {
                    return oldData.map(thread => 
                      thread.id === newThread.id 
                        ? { ...thread, ...newThread }
                        : thread
                    );
                  } else if (eventType === 'DELETE' && oldThread) {
                    return oldData.filter(thread => thread.id !== oldThread.id);
                  }
                  return oldData;
                });
              },
              (error, payload) => {
                console.error('[useThreads] Realtime error (member_a):', error, payload);
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
                
                queryClient.setQueryData(queryKey, (oldData: DirectThreadWithProfiles[] = []) => {
                  if (eventType === 'INSERT' && newThread) {
                    // Add new thread (will need to fetch profile data)
                    queryClient.invalidateQueries({ queryKey });
                    return oldData;
                  } else if (eventType === 'UPDATE' && newThread) {
                    return oldData.map(thread => 
                      thread.id === newThread.id 
                        ? { ...thread, ...newThread }
                        : thread
                    );
                  } else if (eventType === 'DELETE' && oldThread) {
                    return oldData.filter(thread => thread.id !== oldThread.id);
                  }
                  return oldData;
                });
              },
              (error, payload) => {
                console.error('[useThreads] Realtime error (member_b):', error, payload);
              }
            )
          ),
      `threads-hook-${currentUserId}`
    );

    return cleanup;
  }, [currentUserId, queryClient, queryKey]);

  // Create or get existing thread using enhanced function
  const createThread = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');

      const { data: threadId, error } = await supabase.rpc('create_or_get_thread', {
        p_user_a: currentUserId,
        p_user_b: otherUserId,
      });

      if (error) throw error;
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

      if (error) throw error;
    },
    onSuccess: (_, threadId) => {
      // Optimistically update unread counts
      queryClient.setQueryData(queryKey, (oldData: DirectThreadWithProfiles[] = []) => {
        return oldData.map(thread => {
          if (thread.id === threadId) {
            const isMemberA = thread.member_a === currentUserId;
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
      const isMemberA = thread.member_a === currentUserId;
      const friendProfile = isMemberA ? thread.member_b_profile : thread.member_a_profile;
      const friendId = isMemberA ? thread.member_b : thread.member_a;
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
      if (error) throw error;
      
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