import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import isUuid from "@/lib/utils/isUuid";
import { createSafeRealtimeHandler } from "@/lib/realtime/validation";

type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

const PAGE_SIZE = 40;

export function useMessages(threadId: string, surface: "dm" | "floq" | "plan" = "dm") {
  const queryClient = useQueryClient();

  // Paginated history fetch
  const history = useInfiniteQuery({
    queryKey: ["messages", surface, threadId],
    enabled: isUuid(threadId), // Only run when threadId is a valid UUID
    queryFn: async ({ pageParam = 0 }): Promise<any[]> => {
      if (surface === "dm") {
        const { data, error } = await supabase
          .from("direct_messages")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (error) throw error;
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

  // Realtime subscription - listen to database INSERT events
  useEffect(() => {
    if (!isUuid(threadId)) return;

    let mounted = true;
    const tableName = surface === "dm" ? "direct_messages" : "chat_messages";
    
    const channel = supabase
      .channel(`${surface}_messages_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: `thread_id=eq.${threadId}`
        },
        createSafeRealtimeHandler<{ id: string; thread_id: string; sender_id: string }>(
          ({ new: newMessage }) => {
            if (!mounted || !newMessage) return;
            
            console.log('📨 New message received:', newMessage);
            queryClient.setQueryData(
              ["messages", surface, threadId],
              (old: any) => {
                if (!old) return old;
                const pages = old.pages || [];
                const lastPage = pages[pages.length - 1] || [];
                
                // Check if message already exists (prevent duplicates)
                const messageExists = pages.some((page: any[]) =>
                  page.some(msg => msg.id === newMessage.id)
                );
                
                if (!messageExists) {
                  return {
                    ...old,
                    pages: [...pages.slice(0, -1), [...lastPage, newMessage]]
                  };
                }
                return old;
              }
            );
          },
          (error, payload) => {
            if (mounted) {
              console.error('[useMessages] Realtime error:', error, payload);
            }
          }
        )
      )
      .subscribe();
      
    return () => {
      mounted = false;
      supabase.removeChannel(channel)
        .catch(err => console.error('[useMessages] Channel cleanup error:', err));
    };
  }, [surface, threadId, queryClient]);

  return history;
}