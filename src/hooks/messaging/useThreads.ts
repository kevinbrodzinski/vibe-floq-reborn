import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DirectThreadWithProfiles = Database["public"]["Tables"]["direct_threads"]["Row"] & {
  member_a_profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  member_b_profile: {
    display_name: string | null;
    username: string | null; 
    avatar_url: string | null;
  } | null;
};

export const useThreads = () => {
  return useQuery({
    queryKey: ["dm-threads"],
    queryFn: async (): Promise<DirectThreadWithProfiles[]> => {
      const { data, error } = await supabase
        .from("direct_threads")
        .select(`
          *,
          member_a_profile:profiles!direct_threads_member_a_profile_id_fkey(display_name, username, avatar_url),
          member_b_profile:profiles!direct_threads_member_b_profile_id_fkey(display_name, username, avatar_url)
        `)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      
      // Transform the response to handle potential arrays
      const threads = (data || []).map(thread => ({
        ...thread,
        member_a_profile: Array.isArray(thread.member_a_profile) 
          ? thread.member_a_profile[0] || null 
          : thread.member_a_profile,
        member_b_profile: Array.isArray(thread.member_b_profile) 
          ? thread.member_b_profile[0] || null 
          : thread.member_b_profile,
      }));
      
      return threads as DirectThreadWithProfiles[];
    },
  });
};