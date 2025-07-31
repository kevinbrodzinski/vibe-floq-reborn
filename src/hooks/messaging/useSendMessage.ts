import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export function useSendMessage(surface: "dm" | "floq" | "plan" = "dm") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surface,
          thread_id: threadId,
          sender_id: user.id,
          content,
          client_id,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return { ...data, client_id, threadId };
    },

    onSuccess: ({ message, client_id, threadId }) => {
      // Replace optimistic message with real message
      queryClient.setQueryData(["messages", surface, threadId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.map(msg => 
              msg.id === client_id ? { ...message, status: "sent" } : msg
            )
          )
        };
      });
      
      // Invalidate thread list to update previews
      queryClient.invalidateQueries({ queryKey: ["dm-threads"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },

    onError: (_err, { threadId }, _ctx) => {
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
  });
}