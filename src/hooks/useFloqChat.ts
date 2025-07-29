import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@supabase/auth-helpers-react";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FloqMessage {
  id: string;
  floq_id: string;
  sender_id: string;
  body?: string;
  emoji?: string;
  created_at: string;
  sender: {
    display_name: string;
    avatar_url?: string;
    username?: string;
  };
}

interface FloqChatReturn {
  messages: FloqMessage[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isLoading: boolean;
  isError: boolean;
  sendMessage: (payload: { body?: string; emoji?: string }) => Promise<void>;
  isSending: boolean;
}

export function useFloqChat(floqId: string | null): FloqChatReturn {
  const session = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const messageIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<any>(null);

  // Infinite query for messages
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["floq-chat", floqId],
    enabled: !!floqId && !!user,
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (!floqId) throw new Error("No floq ID");

      const { data, error } = await supabase
        .from('floq_messages')
        .select(`
          id,
          floq_id,
          sender_id,
          body,
          emoji,
          created_at,
          profiles!floq_messages_sender_id_fkey (
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('floq_id', floqId)
        .order('created_at', { ascending: true })
        .range(pageParam * 20, (pageParam + 1) * 20 - 1);

      if (error) throw error;

      const messages = data?.map(msg => ({
        id: msg.id,
        floq_id: msg.floq_id,
        sender_id: msg.sender_id,
        body: msg.body || undefined,
        emoji: msg.emoji || undefined,
        created_at: msg.created_at,
        sender: {
          display_name: msg.profiles.display_name,
          avatar_url: msg.profiles.avatar_url || undefined,
          username: msg.profiles.username || undefined,
        },
      })) || [];

      // Track message IDs for deduplication
      messages.forEach(msg => messageIdsRef.current.add(msg.id));

      return {
        messages,
        nextPage: pageParam + 1,
      };
    },
    getNextPageParam: (lastPage: { messages: FloqMessage[]; nextPage: number }, pages) => {
      return lastPage.messages.length === 20 ? pages.length : undefined;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { body?: string; emoji?: string }) => {
      if (!floqId || !user) throw new Error("Not authenticated or no floq");
      
      const { data, error } = await supabase.functions.invoke('post-floq-message', {
        body: {
          floq_id: floqId,
          ...payload,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (newMessage) => {
      // Add to deduplication tracking
      if (newMessage?.message?.id) {
        messageIdsRef.current.add(newMessage.message.id);
      }

      // Optimistically add the message to the cache (append to first page since we use asc order)
      queryClient.setQueryData(
        ["floq-chat", floqId],
        (old: any) => {
          if (!old || !old.pages?.length) return old;
          
          // Guard clause for optimistic insert
          if (!('message' in newMessage)) return old;
          
          const firstPage = old.pages[0];
          
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                messages: [...(firstPage.messages || []), newMessage.message],
              },
              ...old.pages.slice(1),
            ],
          };
        }
      );
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!floqId || !user) {
      // Cleanup channel if conditions not met
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Remove existing channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`floq-chat-${floqId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_messages',
          filter: `floq_id=eq.${floqId}`,
        },
        async (payload) => {
          const messageId = payload.new.id;
          
          // Skip if we've already seen this message
          if (messageIdsRef.current.has(messageId)) {
            return;
          }

          // Fetch the full message with profile data
          const { data: fullMessage, error } = await supabase
            .from('floq_messages')
            .select(`
              id,
              floq_id,
              sender_id,
              body,
              emoji,
              created_at,
              profiles!inner (
                display_name,
                avatar_url,
                username
              )
            `)
            .eq('id', messageId)
            .single();

          if (error || !fullMessage) return;

          const formattedMessage: FloqMessage = {
            id: fullMessage.id,
            floq_id: fullMessage.floq_id,
            sender_id: fullMessage.sender_id,
            body: fullMessage.body || undefined,
            emoji: fullMessage.emoji || undefined,
            created_at: fullMessage.created_at,
            sender: {
              display_name: fullMessage.profiles.display_name,
              avatar_url: fullMessage.profiles.avatar_url || undefined,
              username: fullMessage.profiles.username || undefined,
            },
          };

          // Add to deduplication tracking
          messageIdsRef.current.add(messageId);

          // Add to cache (append to first page since we use asc order)
          queryClient.setQueryData(
            ["floq-chat", floqId],
            (old: any) => {
              if (!old || !old.pages?.length) return old;
              
              const firstPage = old.pages[0];
              
              return {
                ...old,
                pages: [
                  {
                    ...firstPage,
                    messages: [...(firstPage.messages || []), formattedMessage],
                  },
                  ...old.pages.slice(1),
                ],
              };
            }
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [floqId, user?.id, queryClient]);

  // Flatten messages from all pages (already in correct order with asc query)
  const messages = data?.pages.flatMap(page => page.messages) || [];

  return {
    messages,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
    isLoading,
    isError,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}