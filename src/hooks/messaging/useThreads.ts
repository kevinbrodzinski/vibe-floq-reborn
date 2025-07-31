import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DirectThread = Database["public"]["Tables"]["direct_threads"]["Row"];

export const useThreads = () => {
  return useQuery({
    queryKey: ["dm-threads"],
    queryFn: async (): Promise<DirectThread[]> => {
      const { data, error } = await supabase
        .from("direct_threads")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};