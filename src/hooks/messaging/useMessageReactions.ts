import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { realtimeManager } from '@/lib/realtime/manager';
import { createSafeRealtimeHandler } from '@/lib/realtime/validation';
import { supaFn } from '@/lib/supaFn';
import { toast } from 'sonner';

interface MessageReaction {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  reactors: string[];
  hasReacted: boolean;
}

interface ReactionsByMessage {
  [messageId: string]: ReactionSummary[];
}

export function useMessageReactions(threadId: string | undefined, surface: 'dm' | 'floq' | 'plan' = 'dm') {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();
  
  const queryKey = ['message-reactions', surface, threadId] as const;

  // Fetch reactions for all messages in thread
  const { data: reactions = [], isLoading } = useQuery({
    queryKey,
    enabled: !!threadId && !!currentUserId,
    queryFn: async (): Promise<MessageReaction[]> => {
      if (surface !== 'dm') {
        throw new Error('Only DM reactions are currently supported');
      }

      // Try the safer RPC approach first (if migration is applied)
      try {
        const { data, error } = await supabase
          .rpc('get_dm_reactions_by_thread', { p_thread_id: threadId })
          .throwOnError();

        if (error) throw error;
        return data || [];
      } catch (rpcError: any) {
        // If RPC doesn't exist (PGRST202), fall back to the IN filter approach
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('get_dm_reactions_by_thread')) {
          console.log('[useMessageReactions] RPC not available, using fallback IN filter approach');
        } else {
          console.warn('[useMessageReactions] RPC failed, falling back:', rpcError.message);
        }
      }

      // Fallback: Get all messages in thread first
      const { data: messages, error: messagesError } = await supabase
        .from('direct_messages')
        .select('id')
        .eq('thread_id', threadId);

      if (messagesError) throw messagesError;
      if (!messages?.length) return [];

      const messageIds = messages.map(m => m.id).filter(Boolean);

      // 👇 Ensure *all* ids are valid UUIDs to prevent 400 errors
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalid = messageIds.filter(id => !UUID_RE.test(id));
      if (invalid.length) {
        console.warn('[useMessageReactions] Skipping invalid message_ids', invalid);
      }
      const validIds = messageIds.filter(id => UUID_RE.test(id));
      if (validIds.length === 0) return [];

      // Get all reactions for these messages - use only validIds
      const { data, error } = await supabase
        .from('dm_message_reactions')
        .select(`
          id,
          message_id,
          profile_id,
          emoji,
          created_at
        `)
        .in('message_id', validIds)
        .order('created_at', { ascending: true })
        .throwOnError(); // helps expose the real error in console

      if (error) {
        // Handle case where database table doesn't exist yet
        if (error.code === 'PGRST116' || error.message?.includes('dm_message_reactions')) {
          console.warn('[useMessageReactions] Database table not found - returning empty reactions');
          return [];
        }
        throw error;
      }
      return data || [];
    },
    staleTime: 30_000, // 30 seconds
  });

  // ✅ FIX: Stable subscription with useRef hookId and queryKey
  const hookIdRef = useRef(`reactions-hook-${threadId ?? 'none'}-${Math.random().toString(36).slice(2)}`);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey; // Keep it updated

  // Real-time subscription for reaction changes - FIXED: stable dependencies
  useEffect(() => {
    if (!threadId || !currentUserId) return;

    const cleanup = realtimeManager.subscribe(
      `reactions:${threadId}`,
      `dm_reactions_${threadId}`,
      (channel) =>
        channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'dm_message_reactions',
            },
            createSafeRealtimeHandler<MessageReaction>(
              ({ eventType, new: newReaction, old: oldReaction }) => {
                console.log('🎭 Reaction update:', { eventType, newReaction, oldReaction });
                
                queryClient.setQueryData(queryKeyRef.current, (oldData: MessageReaction[] = []) => {
                  if (eventType === 'INSERT' && newReaction) {
                    // Check if reaction already exists to prevent duplicates
                    if (oldData.some(r => r.id === newReaction.id)) return oldData;
                    
                    // Only keep if it belongs to our thread:
                    // (we don't have threadId on row, so gate by known message ids in cache)
                    const relevant = oldData.some(r => r.message_id === newReaction.message_id);
                    return relevant ? [...oldData, newReaction as MessageReaction] : oldData;
                  } else if (eventType === 'DELETE' && oldReaction) {
                    return oldData.filter(r => r.id !== oldReaction.id);
                  } else if (eventType === 'UPDATE' && newReaction) {
                    return oldData.map(r => r.id === newReaction.id ? newReaction as MessageReaction : r);
                  }
                  return oldData;
                });
              },
              (error, payload) => {
                console.error('[useMessageReactions] Realtime error:', error, payload);
              }
            )
          ),
      hookIdRef.current
    );

    return cleanup;
    // ✅ FIXED: Only depend on truly stable values - no queryKey, no reactions
  }, [threadId, currentUserId, queryClient]);

  // Toggle reaction mutation
  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!currentUserId) throw new Error('User not authenticated');

      // Try edge function first (for compatibility with existing system)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No auth session");
        
        const res = await supaFn('toggle-dm-reaction', session.access_token, {
          p_message_id: messageId,
          p_user_id: currentUserId,
          p_emoji: emoji
        });
        
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
      } catch (edgeError) {
        console.warn('Edge function failed, falling back to RPC:', edgeError);
        
        // Fallback to enhanced RPC function
        const { data, error } = await supabase.rpc('toggle_dm_reaction', {
          p_message_id: messageId,
          p_profile_id: currentUserId,
          p_emoji: emoji,
        });

        if (error) {
          // Handle case where database table doesn't exist yet
          if (error.code === 'PGRST116' || error.message?.includes('dm_message_reactions')) {
            console.warn('[useMessageReactions] Database table not found - P2P migrations may not be applied yet');
            return { success: false, message: 'Reactions feature not available yet' };
          }
          throw error;
        }
        return data;
      }
    },
    onMutate: async ({ messageId, emoji }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey });
      
      const previousReactions = queryClient.getQueryData<MessageReaction[]>(queryKey);
      
      queryClient.setQueryData<MessageReaction[]>(queryKey, (old = []) => {
        const existingReaction = old.find(
          r => r.message_id === messageId && r.profile_id === currentUserId && r.emoji === emoji
        );

        if (existingReaction) {
          // Remove reaction
          return old.filter(r => r.id !== existingReaction.id);
        } else {
          // Add reaction
          const optimisticReaction: MessageReaction = {
            id: `temp_${Date.now()}`,
            message_id: messageId,
            profile_id: currentUserId!,
            emoji,
            created_at: new Date().toISOString(),
          };
          return [...old, optimisticReaction];
        }
      });

      return { previousReactions };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousReactions) {
        queryClient.setQueryData(queryKey, context.previousReactions);
      }
      
      // Handle database table not existing gracefully
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('dm_message_reactions') || errorMessage.includes('not available yet')) {
        console.warn('[useMessageReactions] Reaction feature not available - database not ready');
        // Don't show error toast for missing database tables
        return;
      }
      
      toast.error('Failed to update reaction', {
        description: errorMessage,
      });
    },
    onSuccess: () => {
      // Refetch to get the real data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Process reactions into summary format
  const reactionsByMessage: ReactionsByMessage = reactions.reduce((acc, reaction) => {
    const { message_id, emoji, profile_id } = reaction;
    
    if (!acc[message_id]) {
      acc[message_id] = [];
    }
    
    let emojiSummary = acc[message_id].find(r => r.emoji === emoji);
    if (!emojiSummary) {
      emojiSummary = {
        emoji,
        count: 0,
        reactors: [],
        hasReacted: false,
      };
      acc[message_id].push(emojiSummary);
    }
    
    emojiSummary.count++;
    emojiSummary.reactors.push(profile_id);
    
    if (profile_id === currentUserId) {
      emojiSummary.hasReacted = true;
    }
    
    return acc;
  }, {} as ReactionsByMessage);

  return {
    reactionsByMessage,
    toggleReaction: toggleReaction.mutate,
    isToggling: toggleReaction.isPending,
    isLoading,
    rawReactions: reactions,
  };
}

// Helper hook for a single message's reactions
export function useMessageReactionsSingle(messageId: string) {
  const currentUserId = useCurrentUserId();
  
  return useQuery({
    queryKey: ['message-reactions-single', messageId],
    enabled: !!messageId && !!currentUserId,
    queryFn: async (): Promise<ReactionSummary[]> => {
      const { data, error } = await supabase
        .from('dm_message_reactions')
        .select('emoji, profile_id')
        .eq('message_id', messageId);

      if (error) throw error;

      // Aggregate reactions
      const reactionMap = new Map<string, ReactionSummary>();
      
      data?.forEach(({ emoji, profile_id }) => {
        if (!reactionMap.has(emoji)) {
          reactionMap.set(emoji, {
            emoji,
            count: 0,
            reactors: [],
            hasReacted: false,
          });
        }
        
        const summary = reactionMap.get(emoji)!;
        summary.count++;
        summary.reactors.push(profile_id);
        
        if (profile_id === currentUserId) {
          summary.hasReacted = true;
        }
      });

      return Array.from(reactionMap.values());
    },
    staleTime: 30_000,
  });
}