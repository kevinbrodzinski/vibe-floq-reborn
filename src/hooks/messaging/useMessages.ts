import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

const PAGE_SIZE = 40;

export function useMessages(threadId: string, surface: "dm" | "floq" | "plan" = "dm") {
  const queryClient = useQueryClient();

  // Paginated history fetch
  const history = useInfiniteQuery({
    queryKey: ["messages", surface, threadId],
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`${surface}:${threadId}`)
      .on("broadcast", { event: "message_sent" }, ({ payload }) => {
        queryClient.setQueryData(
          ["messages", surface, threadId],
          (old: any) => {
            if (!old) return old;
            const pages = old.pages || [];
            const lastPage = pages[pages.length - 1] || [];
            
            // Check if message already exists (prevent duplicates)
            const messageExists = pages.some((page: any[]) =>
              page.some(msg => msg.id === payload.message.id)
            );
            
            if (!messageExists) {
              return {
                ...old,
                pages: [...pages.slice(0, -1), [...lastPage, payload.message]]
              };
            }
            return old;
          }
        );
      })
      .on("broadcast", { event: "thread_read" }, ({ payload }) => {
        // Handle read receipts if needed
        console.log("Thread read:", payload);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [surface, threadId, queryClient]);

  return history;
}