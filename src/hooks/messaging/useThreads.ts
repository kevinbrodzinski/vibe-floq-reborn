import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const DELETED_USER_PROFILE = {
  display_name: '(Deleted User)',
  username: null,
  avatar_url: null
} as const;

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
      
      // Transform the response and add safety guards for deleted profiles
      const threads = (data || []).map(thread => ({
        ...thread,
        member_a_profile: thread.member_a_profile || DELETED_USER_PROFILE,
        member_b_profile: thread.member_b_profile || DELETED_USER_PROFILE,
      }));
      
      return threads as DirectThreadWithProfiles[];
    },
  });
};