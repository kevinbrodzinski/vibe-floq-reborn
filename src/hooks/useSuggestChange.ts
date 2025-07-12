import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getEnvironmentConfig, isDemo } from "@/lib/environment";
import { supabase } from "@/integrations/supabase/client";

interface SuggestChangePayload {
  floq_id: string;
  venue_id?: string | null;
  at?: string | null;
  note?: string | null;
}

export function useSuggestChange() {
  const [optimisticSuggestion, setOptimisticSuggestion] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: SuggestChangePayload) => {
      // Demo/offline mode - just simulate success
      if (isDemo() || getEnvironmentConfig().presenceMode === "offline") {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        return { success: true };
      }

      // Real endpoint call
      const { data, error } = await supabase.functions.invoke("floq-suggest-change", {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
    onMutate: (variables) => {
      // Optimistic update - show immediate feedback
      const parts = [];
      if (variables.venue_id) parts.push("📍 New venue");
      if (variables.at) parts.push("🕐 Time change");
      if (variables.note) parts.push("💬 Note");
      
      setOptimisticSuggestion(parts.join(" • "));
    },
    onSuccess: () => {
      if (isDemo() || getEnvironmentConfig().presenceMode === "offline") {
        toast({
          title: "Suggestion queued (demo)",
          description: "Pretending to send this to group chat.",
        });
      } else {
        toast({
          title: "Suggestion sent",
          description: "Your suggestion has been shared with the group.",
        });
      }
      setOptimisticSuggestion(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Could not send suggestion",
        description: error.message || "Something went wrong",
      });
      setOptimisticSuggestion(null);
    },
  });

  return {
    suggestChange: mutation.mutate,
    isLoading: mutation.isPending,
    optimisticSuggestion,
  };
}