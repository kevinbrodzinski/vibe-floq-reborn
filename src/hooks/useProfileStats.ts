import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface VibeEntry {
  vibe: string;
  timestamp: number;
  ts: string;
}

export interface VibeDistribution {
  vibe: string;
  count: number;
  percentage: number;
}

export interface ProfileStats {
  friend_count: number;
  crossings_7d: number;
  most_active_vibe: string;
  days_active_this_month: number;
  total_achievements: number;
  vibe_distribution: VibeDistribution[];
  recent_vibes: VibeEntry[];
}

export const useProfileStats = (targetUserId?: string) => {
  const { user } = useAuth();
  const profileId = targetUserId || user?.id;

  return useQuery({
    queryKey: ['profile-stats', profileId],
    queryFn: async () => {
      if (!profileId) throw new Error('User ID is required');
      
      try {
        const { data, error } = await supabase.rpc('get_profile_stats', {
          target_profile_id: profileId,
          metres: 100, // Parameter name should be 'metres' based on RPC signature
          seconds: 3600
        });

        if (error) {
          console.error('Profile stats RPC error:', error);
          toast.error('Failed to load profile stats');
          throw error;
        }
        
        return data as unknown as ProfileStats;
      } catch (err) {
        console.error('Profile stats error:', err);
        throw err;
      }
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};