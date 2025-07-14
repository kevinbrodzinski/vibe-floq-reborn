import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

interface UnreadCounts {
  floq_id: string;
  unread_chat: number;
  unread_activity: number;
  unread_plans: number;
  unread_total: number;
}

export const useUnreadCounts = (floqId: string) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['unread-counts', floqId, session?.user?.id],
    queryFn: async (): Promise<UnreadCounts | null> => {
      if (!session?.user?.id) return null;

      // For now, return mock data since we haven't implemented the unread view yet
      // In the future, this would query a user_floq_unread_counts view
      return {
        floq_id: floqId,
        unread_chat: 0,
        unread_activity: 0,
        unread_plans: 0,
        unread_total: 0,
      };
    },
    enabled: !!session?.user?.id && !!floqId,
    staleTime: 30_000, // 30 seconds
  });
};

export const useMyFloqsUnreadCounts = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-floqs-unread', session?.user?.id],
    queryFn: async (): Promise<UnreadCounts[]> => {
      if (!session?.user?.id) return [];

      // Mock data for now - this would query all floqs with unread counts
      return [];
    },
    enabled: !!session?.user?.id,
    staleTime: 30_000,
  });
};