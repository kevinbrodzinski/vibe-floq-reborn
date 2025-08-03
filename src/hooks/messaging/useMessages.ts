import { useEffect, useId } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import isUuid from "@/lib/utils/isUuid";
import { createSafeRealtimeHandler } from "@/lib/realtime/validation";
import { realtimeManager } from "@/lib/realtime/manager";

type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
type MessageRow = DirectMessage | ChatMessage;
type MessagesInfinite = { pages: MessageRow[][]; pageParams: unknown[] };

const PAGE_SIZE = 40;

// Helper function to add message to pages
function addMessage(old: MessagesInfinite, msg: MessageRow): MessagesInfinite {
  const pages = [...old.pages];
  const lastPage = pages[pages.length - 1] || [];
  
  // Type-safe metadata access
  const msgMetadata = msg.metadata as any;
  const msgClientId = msgMetadata?.client_id;
  
  // Remove any optimistic message with the same client_id
  if (msgClientId) {
    for (let i = 0; i < pages.length; i++) {
      pages[i] = pages[i].filter(m => {
        const metadata = m.metadata as any;
        return metadata?.client_id !== msgClientId;
      });
    }
  }
  
  // Check if message already exists (prevent duplicates)
  const messageExists = pages.some(page =>
    page.some(m => m.id === msg.id)
  );
  
  if (!messageExists) {
    const newLastPage = [...lastPage, msg];
    pages[pages.length - 1] = newLastPage;
  }
  
  return { ...old, pages };
}

export function useMessages(threadId: string | undefined, surface: "dm" | "floq" | "plan" = "dm", opts?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  // Stable hookId across renders
  const hookId = useId();
  
  console.log('[useMessages hook]', { threadId, surface, isValidUuid: threadId ? isUuid(threadId) : false, enabled: opts?.enabled });

  // Paginated history fetch
  const history = useInfiniteQuery({
    queryKey: ["messages", surface, threadId],
    enabled: threadId ? isUuid(threadId) && (opts?.enabled ?? true) : false, // Only run when threadId is valid and enabled
    queryFn: async ({ pageParam = 0 }): Promise<any[]> => {
      console.log('[useMessages queryFn]', { surface, threadId, pageParam });
      if (surface === "dm") {
        console.log('[useMessages] Fetching DM messages for thread:', threadId);
        const { data, error } = await supabase
          .from("direct_messages")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (error) {
          console.error('[useMessages] DM fetch error:', error);
          throw error;
        }
        console.log('[useMessages] DM fetch success:', data?.length, 'messages');
        return data.reverse(); // oldest → newest
      } else {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (error) throw error;
        return data.reverse(); // oldest → newest
      }
    },
    getNextPageParam: (last, all) =>
      last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE,
    initialPageParam: 0,
  });

  // Realtime subscription - use RealtimeManager to prevent duplicates
  useEffect(() => {
    if (!threadId || !isUuid(threadId)) return;

    console.log('[RealtimeManager] Setting up subscription for:', threadId);
    const tableName = surface === "dm" ? "direct_messages" : "chat_messages";
    
    const cleanup = realtimeManager.subscribe(
      `${surface}:${threadId}`, // key
      `${surface}_messages_${threadId}`, // channel name
      (channel) => 
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
            filter: `thread_id=eq.${threadId}`
          },
          createSafeRealtimeHandler<MessageRow>(
            ({ new: newMessage }) => {
              if (!newMessage) return;
              
               console.log('📨 New message received:', newMessage);
              // Use functional update to prevent stale closures
              queryClient.setQueryData(
                ["messages", surface, threadId],
                (old: MessagesInfinite | undefined) => {
                  if (!old) return old;
                  return addMessage(old, newMessage as MessageRow);
                }
              );
            },
            (error, payload) => {
              console.error('[useMessages] Realtime error:', error, payload);
            }
          )
        ),
      hookId
    );
      
    return cleanup;
  }, [surface, threadId, queryClient, hookId]);

  return history;
}