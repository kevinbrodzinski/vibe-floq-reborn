import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

interface UnreadCounts {
  user_id: string;
  floq_id: string;
  unread_chat: number;
  unread_activity: number;
  unread_plans: number;
  unread_total: number;
}

export const useUnreadCounts = (floqId: string) => {
  const { session } = useAuth();

  return useQuery<UnreadCounts | null>({
    queryKey: ['unread-counts', floqId, session?.user?.id],
    queryFn: async (): Promise<UnreadCounts | null> => {
      if (!session?.user?.id) return null;

      // Query the user_floq_unread_counts view
      const { data, error } = await supabase
        .from('user_floq_unread_counts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('floq_id', floqId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching unread counts:', error);
        return null;
      }

      // Return with computed total
      return data ? {
        ...data,
        unread_total: data.unread_chat + data.unread_activity + data.unread_plans
      } : {
        user_id: session.user.id,
        floq_id: floqId,
        unread_chat: 0,
        unread_activity: 0,
        unread_plans: 0,
        unread_total: 0,
      };
    },
    enabled: !!session?.user?.id && !!floqId,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
    refetchOnWindowFocus: false,
  });
};

export const useMyFloqsUnreadCounts = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-floqs-unread', session?.user?.id],
    queryFn: async (): Promise<UnreadCounts[]> => {
      if (!session?.user?.id) return [];

      // Query all floq unread counts for the current user
      const { data, error } = await supabase
        .from('user_floq_unread_counts')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching my floqs unread counts:', error);
        return [];
      }

      // Return with computed totals
      return data?.map(item => ({
        ...item,
        unread_total: item.unread_chat + item.unread_activity + item.unread_plans
      })) || [];
    },
    enabled: !!session?.user?.id,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });
};

// Hook to get total unread count across all floqs (for navbar badge)
export const useGlobalUnreadCount = () => {
  const unreadCounts = useMyFloqsUnreadCounts();
  
  const totalUnread = unreadCounts.data?.reduce(
    (sum, floq) => sum + floq.unread_total, 
    0
  ) || 0;

  return {
    totalUnread,
    isLoading: unreadCounts.isLoading,
    error: unreadCounts.error
  };
};

// Hook for individual tab badges within a floq
export const useFloqTabBadges = (floqId: string) => {
  const unreadCounts = useUnreadCounts(floqId);
  
  return {
    chatBadge: unreadCounts.data?.unread_chat || 0,
    activityBadge: unreadCounts.data?.unread_activity || 0,
    plansBadge: unreadCounts.data?.unread_plans || 0,
    isLoading: unreadCounts.isLoading,
    error: unreadCounts.error
  };
};

// Invalidation helper for notifications
const invalidateNotifications = (queryClient: any, userId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  queryClient.invalidateQueries({ queryKey: ['notification-counts', userId] });
};

// Hook for notification counts (from user_notifications table)
export const useNotificationCounts = (userId?: string) => {
  return useQuery({
    queryKey: ['notification-counts', userId],
    queryFn: async (): Promise<{ total: number }> => {
      if (!userId) return { total: 0 };

      const { count, error } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('Error fetching notification counts:', error);
        return { total: 0 };
      }

      return { total: count ?? 0 };
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};

// Export the helper for use in components
export { invalidateNotifications };