import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreateFloqParams = {
  name: string;
  title?: string;
  description?: string;
  privacy: "open"|"request"|"invite";
  vibe: string;
};

export type FlockType = "public" | "private" | "invite_only";

export type CreateFloqResult = { id: string };

export function useCreateFloq() {
  return useMutation<CreateFloqResult, Error, CreateFloqParams>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.functions.invoke("floq-create", {
        body: payload,
      });
      if (error) throw error;
      return data as CreateFloqResult;
    }
  });
}