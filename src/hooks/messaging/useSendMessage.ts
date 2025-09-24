import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { limitedSendMessage } from "@/services/messages";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { assertUuid } from "@/lib/ids";

type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export function useSendMessage(surface: "dm" | "floq" | "plan" = "dm") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, content, replyTo }: { 
      threadId: string; 
      content: string; 
      replyTo?: string | null; 
    }) => {
      console.log('[useSendMessage] Starting mutation:', { threadId, content, replyTo });
      
      // Validate required parameters
      assertUuid(threadId, 'threadId');
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
          reply_to: replyTo, // ✅ FIX: Use reply_to to match database column
        };

        const pages = old.pages || [];
        const lastPage = pages[pages.length - 1] || [];
        
        return {
          ...old,
          pages: [...pages.slice(0, -1), [...lastPage, optimisticMessage]]
        };
      });

      console.log('[useSendMessage] Sending message...');
      try {
        // ✅ FIX: Use direct RPC for DM messages, Edge Function for others
        if (surface === 'dm') {
          // ✅ DM: Use direct RPC to avoid CORS issues
          const { data, error } = await supabase.rpc('send_dm_message_uuid', {
            p_thread_id: threadId,
            p_sender_id: user.id,
            p_body: content,
            p_reply_to: replyTo ?? null,
            p_media: null,
            p_type: 'text'
          });
          
          if (error) throw error;
          
          console.log('[useSendMessage] RPC success:', data);
          return { message: data, client_id, threadId };
        } else {
          // ✅ FLOQ/PLAN: Keep using Edge Function for now
          const { data, error } = await supabase.functions.invoke('send-message', {
            body: {
              thread_id: threadId,
              profile_id: user.id,
              content,
              reply_to: replyTo ?? null,
              client_id,
            }
          });
          
          if (error) throw error;
          
          console.log('[useSendMessage] Edge Function success:', data);
          return { message: data, client_id, threadId };
        }
      } catch (primaryError) {
        console.warn('[useSendMessage] Primary method failed, trying RPC fallback:', primaryError);
        
        // ✅ FIX: Fallback to correct RPC function name
        try {
          const { data, error } = await supabase.rpc('send_dm_message', {
            p_thread_id: threadId,
            p_sender_id: user.id,
            p_body: content,
            p_reply_to: replyTo ?? null,
            p_type: 'text'
          });
          
          if (error) throw error;
          
          console.log('[useSendMessage] RPC fallback success:', data);
          return { message: data, client_id, threadId };
        } catch (rpcError) {
          console.error('[useSendMessage] Both primary and RPC fallback failed:', { primaryError, rpcError });
          throw rpcError; // Throw the RPC error as it's likely more informative
        }
      }
    },

    /** automatic retries w/ exponential back-off only when 429 */
    retry: (failureCount, err: any) =>
      err?.status === 429 && failureCount < 3,

    retryDelay: (failureCount) => 2 ** failureCount * 1000, // 1s,2s,4s

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

    onError: (err: any, { threadId }, _ctx) => {
      console.log('[useSendMessage] Error:', err);
      
      // Show user-friendly error messages
      if (err?.status === 429) {
        toast.info('Slow down a sec 🐢', {
          description: 'You\'re sending messages too quickly. Trying again…',
        });
      } else {
        toast.error("Couldn't send message", {
          description: err?.message ?? 'Unknown error',
        });
      }
      
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