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

type Surface = 'dm' | 'floq' | 'plan';
type EnabledOpt = boolean | (() => boolean);
type UseMessagesOpts = { enabled?: EnabledOpt };

const PAGE_SIZE = 40;

type Page = {
  rows: MessageRow[];
  nextCursor?: string | null;
};

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

async function fetchPage(params: {
  threadId: string;
  surface: Surface;
  pageParam?: string | null;
}): Promise<Page> {
  const { threadId, surface, pageParam } = params;
  const offset = pageParam ? parseInt(pageParam, 10) : 0;

  if (surface === "dm") {
    console.log('[useMessages] Fetching DM messages for thread:', threadId);
    const { data, error } = await supabase
      .from("v_dm_messages_expanded") // ✅ Use the new view with replies and reactions
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('[useMessages] DM fetch error:', error);
      throw error;
    }
    console.log('[useMessages] DM fetch success:', data?.length, 'messages');
    const rows = (data || []).reverse(); // oldest → newest
    const nextCursor = data && data.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : null;
    return { rows, nextCursor };
  } else {
    // Handle floq/plan messages
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    const rows = (data || []).reverse();
    const nextCursor = data && data.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : null;
    return { rows, nextCursor };
  }
}

export function useMessages(
  threadIdRaw?: string,
  surface: Surface = 'dm',
  opts: UseMessagesOpts = {}
) {
  const queryClient = useQueryClient();

  // 1) Normalize thread id - reject '', trim, and UUID-check
  const safeThreadId = useMemo(() => {
    const t = (threadIdRaw ?? '').trim();
    return isUuid(t) ? t : undefined;
  }, [threadIdRaw]);

  // 2) Normalize enabled (boolean or callback only)
  const enabledFromOpt: boolean =
    typeof opts.enabled === 'function'
      ? !!opts.enabled()
      : typeof opts.enabled === 'boolean'
      ? opts.enabled
      : true; // default true when we have a valid thread

  const enabled: boolean = !!safeThreadId && enabledFromOpt;

  // 3) Stable key even when disabled (do NOT put '' in keys)
  const key = ['messages', surface, safeThreadId ?? 'none'] as const;

  console.log('[useMessages hook - hardened]', { 
    threadIdRaw,
    safeThreadId,
    surface, 
    enabledFromOpt,
    enabled,
    enabledType: typeof enabled
  });

  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: null as string | null,
    enabled, // <-- always a real boolean now
    queryFn: ({ pageParam }) => {
      console.log('[useMessages queryFn]', { surface, safeThreadId, pageParam });
      return fetchPage({ threadId: safeThreadId!, surface, pageParam });
    },
    getNextPageParam: (lastPage) => {
      return lastPage?.nextCursor ?? undefined;
    },
    select: (data) => {
      // Optional: de-dupe across pages just in case
      const seen = new Set<string>();
      const pages = data.pages.map((p) => {
        const rows = (p.rows ?? []).filter((m: any) => {
          if (!m?.id || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        return { ...p, rows };
      });
      return { ...data, pages };
    },
    staleTime: 30_000,
  });

  // 4) Realtime subscription only when enabled - use RealtimeManager to prevent duplicates
  useEffect(() => {
    if (!enabled || !safeThreadId) return;

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
                key,
                (old: any) => {
                  if (!old) return old;
                  // Convert to our expected format and add message
                  const converted = {
                    pages: old.pages.map((p: Page) => p.rows),
                    pageParams: old.pageParams
                  };
                  return addMessage(converted, newMessage as MessageRow);
                }
              );
            },
            `${surface}_messages_realtime`
          )
        )
    );
      
    return cleanup;
  }, [enabled, safeThreadId, surface, queryClient, key]);

  return {
    ...query,
    // Re-expose a normalized shape for the list to consume
    data: query.data
      ? {
          pages: query.data.pages.map((p: Page) => p.rows),
        }
      : undefined,
  };
}