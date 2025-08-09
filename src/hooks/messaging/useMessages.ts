import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import isUuid from "@/lib/utils/isUuid";
import { createSafeRealtimeHandler } from "@/lib/realtime/validation";
import { realtimeManager } from "@/lib/realtime/manager";

// ✅ Updated types for the new expanded view
type ExpandedMessage = {
  id: string;
  thread_id: string;
  profile_id: string;
  content: string | null;
  created_at: string;
  reply_to: string | null;
  reply_to_msg: { 
    id: string | null; 
    content: string | null; 
    created_at: string | null; 
    profile_id: string | null 
  } | null;
  reactions: Array<{ 
    emoji: string; 
    count: number; 
    reactors: string[] 
  }>;
};

type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
type MessageRow = ExpandedMessage | ChatMessage;

const PAGE_SIZE = 40;

// Helper function to add message to pages
function addMessage(old: any, msg: MessageRow): any {
  const pages = [...old.pages];
  const lastPage = pages[pages.length - 1] || [];
  
  // Type-safe metadata access
  const msgMetadata = msg.metadata as any;
  const msgClientId = msgMetadata?.client_id;
  
  // Remove any optimistic message with the same client_id
  if (msgClientId) {
    for (let i = 0; i < pages.length; i++) {
      pages[i] = pages[i].filter((m: any) => {
        const metadata = m.metadata as any;
        return metadata?.client_id !== msgClientId;
      });
    }
  }
  
  // Add new message to the last page
  const updatedLastPage = [...lastPage, msg];
  pages[pages.length - 1] = updatedLastPage;
  
  return {
    pages,
    pageParams: old.pageParams
  };
}

export function useMessages(
  threadId: string | undefined,
  surface: "dm" | "floq" | "plan" = "dm",
  opts?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();

  // ✅ Normalize threadId and enabled so they are always boolean / undefined
  const safeThreadId =
    typeof threadId === "string" && isUuid(threadId) ? threadId : undefined;

  const enabledFlag = Boolean(
    // if caller passed something, coerce to boolean
    opts?.enabled ??
      // otherwise: only enable when we have a valid thread id
      (safeThreadId ? true : false)
  );

  const hookId = useMemo(
    () => `messages-${surface}-${safeThreadId ?? "none"}`,
    [surface, safeThreadId]
  );

  // (optional) debug
  console.log('[useMessages]', { safeThreadId, surface, enabledFlag, enabledType: typeof enabledFlag });

  const history = useInfiniteQuery({
    // ✅ keep key stable even when id is absent
    queryKey: ["messages", surface, safeThreadId ?? "none"],
    // ✅ always a boolean
    enabled: enabledFlag,
    queryFn: async ({ pageParam = 0 }) => {
      if (!safeThreadId) return []; // extra safety
      console.log('[useMessages queryFn]', { surface, safeThreadId, pageParam });
      if (surface === "dm") {
        console.log('[useMessages] Fetching DM messages for thread:', safeThreadId);
        const { data, error } = await supabase
          .from("v_dm_messages_expanded")
          .select("*")
          .eq("thread_id", safeThreadId)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);
        if (error) {
          console.error('[useMessages] DM fetch error:', error);
          throw error;
        }
        console.log('[useMessages] DM fetch success:', data?.length, 'messages');
        return (data ?? []).reverse();
      }
      // Handle floq/plan messages
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", safeThreadId)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []).reverse();
    },
    getNextPageParam: (last, all) =>
      last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE,
    initialPageParam: 0,
  });

  // Realtime subscription - use RealtimeManager to prevent duplicates
  useEffect(() => {
    if (!safeThreadId || !enabledFlag) return;

    console.log('[RealtimeManager] Setting up subscription for:', safeThreadId);
    const tableName = surface === "dm" ? "direct_messages" : "chat_messages";
    
    const cleanup = realtimeManager.subscribe(
      `${surface}:${safeThreadId}`, // key
      `${surface}_messages_${safeThreadId}`, // channel name
      (channel) => 
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
            filter: `thread_id=eq.${safeThreadId}`
          },
          createSafeRealtimeHandler<MessageRow>(
            ({ new: newMessage }) => {
              if (!newMessage?.id) return;
              console.log('📨 New message received:', newMessage);
              // Use functional update to prevent stale closures
              queryClient.setQueryData(
                ["messages", surface, safeThreadId ?? "none"],
                (old: any) => {
                  if (!old) return old;
                  return addMessage(old, newMessage as MessageRow);
                }
              );
            },
            `${surface}_messages_realtime`
          )
        )
    );
      
    return cleanup;
  }, [surface, safeThreadId, queryClient, hookId, enabledFlag]);

  return history;
}