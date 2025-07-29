import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

interface UnreadCounts {
  profile_id: string;
  floq_id: string;
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
        .eq('profile_id', session.user.id)
        .eq('floq_id', floqId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching unread counts:', error);
        return null;
      }

      // Return with total
      return data ? {
        profile_id: data.profile_id || session.user.id,
        floq_id: data.floq_id || floqId,
        unread_total: data.unread || 0
      } : {
        profile_id: session.user.id,
        floq_id: floqId,
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
        .eq('profile_id', session.user.id);

      if (error) {
        console.error('Error fetching my floqs unread counts:', error);
        return [];
      }

      // Return with totals mapped
      return data?.map(item => ({
        profile_id: item.profile_id,
        floq_id: item.floq_id,
        unread_total: item.unread || 0
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
    chatBadge: unreadCounts.data?.unread_total || 0,
    activityBadge: 0,
    plansBadge: 0,
    isLoading: unreadCounts.isLoading,
    error: unreadCounts.error
  };
};

// Invalidation helper for notifications
export const invalidateNotifications = (queryClient: any, profileId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['notifications', profileId] });
  queryClient.invalidateQueries({ queryKey: ['notification-counts', profileId] });
};

// Hook for notification counts (from user_notifications table)
export const useNotificationCounts = (profileId?: string) => {
  return useQuery({
    queryKey: ['notification-counts', profileId],
    queryFn: async (): Promise<{ total: number }> => {
      if (!profileId) return { total: 0 };

      const { count, error } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .is('read_at', null);

      if (error) {
        console.error('Error fetching notification counts:', error);
        return { total: 0 };
      }

      return { total: count ?? 0 };
    },
    enabled: !!profileId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};
