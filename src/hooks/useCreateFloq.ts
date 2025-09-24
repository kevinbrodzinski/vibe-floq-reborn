import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SimpleFloq } from "@/types/simplified";

export type CreateFloqParams = {
  name?: string;
  title?: string;
  description?: string;
  privacy?: "open"|"request"|"invite";
  vibe?: string;
  primary_vibe?: string;
  location?: { lat: number; lng: number };
  starts_at?: string;
  ends_at?: string | null;
  flock_type?: FlockType;
  visibility?: "public" | "private";
  invitees?: string[];
  max_participants?: number;
};

export type FlockType = "momentary" | "persistent";

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