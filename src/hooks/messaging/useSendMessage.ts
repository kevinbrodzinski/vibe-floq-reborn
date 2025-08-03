import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supaFn } from "@/lib/supaFn";
import type { Database } from "@/integrations/supabase/types";

type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export function useSendMessage(surface: "dm" | "floq" | "plan" = "dm") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      console.log('[useSendMessage] Starting mutation:', { threadId, content });
      
      // Validate required parameters
      if (!threadId || threadId === 'null') {
        throw new Error("Thread ID is required and cannot be null");
      }
      if (!content?.trim()) {
        throw new Error("Message content is required");
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Authentication required");

      const client_id = crypto.randomUUID();

      // Optimistic update
      queryClient.setQueryData(["messages", surface, threadId], (old: any) => {
        if (!old) return old;
        
        const optimisticMessage = {
          id: client_id,
          thread_id: threadId,
          sender_id: user.id,
          profile_id: user.id,
          content,
          created_at: new Date().toISOString(),
          metadata: { client_id },
          status: "sending",
          message_type: "text",
          reply_to_id: null,
        };

        const pages = old.pages || [];
        const lastPage = pages[pages.length - 1] || [];
        
        return {
          ...old,
          pages: [...pages.slice(0, -1), [...lastPage, optimisticMessage]]
        };
      });

      // Send via direct fetch to avoid DataCloneError with supabase.functions.invoke()
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No auth session");

      console.log('[useSendMessage] Calling supaFn...');
      try {
        const res = await supaFn(
          "send-message",
          session.access_token,
          { surface, thread_id: threadId, sender_id: user.id, content, client_id }
        );
        
        console.log('[useSendMessage] supaFn resolved:', res.ok, res.status);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.log('[useSendMessage] Error response:', errorText);
          throw new Error(`Failed to send message: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        console.log('[useSendMessage] Success data:', data);
        return { ...data, client_id, threadId };
      } catch (error) {
        console.error('[useSendMessage] supaFn error:', error);
        throw error; // Make sure we re-throw so the mutation fails properly
      }
    },

    onSuccess: ({ message, client_id, threadId }) => {
      // Replace optimistic message with real message
      queryClient.setQueryData(["messages", surface, threadId], (old: any) => {
        if (!old) return old;
        
        // Remove any "sending" msg with this client_id across ALL pages
        const pages = old.pages.map((page: any[]) =>
          page.filter(
            (m) => !(m.status === 'sending' && m.metadata?.client_id === client_id)
          )
        );

        // Add the confirmed server row to the last page
        const lastPageIndex = pages.length - 1;
        if (lastPageIndex >= 0) {
          pages[lastPageIndex].push({ ...message, status: 'sent' });
        }

        return { ...old, pages };
      });
      
      // Invalidate thread list to update previews
      queryClient.invalidateQueries({ queryKey: ["dm-threads"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },

    onError: (err, { threadId }, _ctx) => {
      console.log('[useSendMessage] Error:', err);
      // Remove failed optimistic message
      queryClient.setQueryData(["messages", surface, threadId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.filter(msg => msg.status !== "sending")
          )
        };
      });
    },

    onSettled: (_data, _error) => {
      console.log('[useSendMessage] Mutation settled');
      // This ensures the pending flag is cleared even if something goes wrong
    },
  });
}