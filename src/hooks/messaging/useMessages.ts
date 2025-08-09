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
type MessageRow = ExpandedMessage | ChatMessage; // ✅ Use ExpandedMessage for DMs
type MessagesInfinite = { pages: MessageRow[][]; pageParams: unknown[] };

const PAGE_SIZE = 40;
const UUID_RE = /^[0-9a-f-]{36}$/i;

type Opts = { enabled?: boolean };

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
  
  // Add new message to the last page
  const updatedLastPage = [...lastPage, msg];
  pages[pages.length - 1] = updatedLastPage;
  
  return {
    pages,
    pageParams: old.pageParams
  };
}

export function useMessages(
  threadId?: string,
  surface: 'dm' | 'floq' | 'plan' = 'dm',
  opts: Opts = {}
) {
  const queryClient = useQueryClient();
  
  // ---- compute safe flags once ----
  const safeThreadId =
    typeof threadId === 'string' && threadId.trim().length > 0 ? threadId : undefined;

  const safeEnabled = Boolean(opts?.enabled); // <-- force to boolean (never '', null, etc.)
  const uuidOk = !!safeThreadId && isUuid(safeThreadId);
  
  // Stable hookId across renders - only changes when threadId or surface changes
  const hookId = useMemo(() => {
    if (!safeThreadId) return `messages-${surface}-no-thread`;
    return `messages-${surface}-${safeThreadId}`;
  }, [surface, safeThreadId]);
  
  console.log('[useMessages hook]', { 
    threadId, 
    safeThreadId,
    surface, 
    uuidOk,
    safeEnabled,
    optsEnabled: opts?.enabled,
    finalEnabled: uuidOk && (opts?.enabled === undefined ? true : safeEnabled)
  });

  // ---------------- queries ----------------
  const history = useInfiniteQuery({
    queryKey: ['messages', surface, safeThreadId],
    queryFn: async ({ pageParam = 0 }): Promise<MessageRow[]> => {
      console.log('[useMessages queryFn]', { surface, safeThreadId, pageParam });
      if (surface === "dm") {
        console.log('[useMessages] Fetching DM messages for thread:', safeThreadId);
        const { data, error } = await supabase
          .from("v_dm_messages_expanded") // ✅ Use the new view with replies and reactions
          .select("*")
          .eq("thread_id", safeThreadId!)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (error) {
          console.error('[useMessages] DM fetch error:', error);
          throw error;
        }
        console.log('[useMessages] DM fetch success:', data?.length, 'messages');
        return data.reverse(); // oldest → newest
      } else {
        // Handle floq/plan messages
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("thread_id", safeThreadId!)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (error) throw error;
        return data.reverse();
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return lastPage.length; // Use length as offset for next page
    },
    enabled: uuidOk && (opts?.enabled === undefined ? true : safeEnabled), // <-- boolean only
    staleTime: 30_000,
  });

  // Realtime subscription - use RealtimeManager to prevent duplicates
  useEffect(() => {
    if (!safeThreadId || !uuidOk) return;

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
              if (!newMessage) return;
              
               console.log('📨 New message received:', newMessage);
              // Use functional update to prevent stale closures
              queryClient.setQueryData(
                ["messages", surface, safeThreadId],
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
  }, [surface, safeThreadId, queryClient, hookId, uuidOk]);

  return history;
}