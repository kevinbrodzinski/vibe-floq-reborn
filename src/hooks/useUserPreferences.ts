import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UserPreferences {
  user_id: string;
  preferred_vibe: string;
  vibe_color: string;
  vibe_strength: number;
  checkin_streak: number;
  favorite_locations: string[];
  feedback_sentiment: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch user preferences
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserPreferences | null;
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get vibe colors mapping
 */
export function getVibeColor(vibe: string): string {
  const vibeColors: Record<string, string> = {
    chill: '#cfe8f5',
    energetic: '#fef08a', 
    romantic: '#fce7f3',
    wild: '#e9d5ff',
    cozy: '#fed7d7',
    deep: '#ccfbf1',
  };
  return vibeColors[vibe] || '#e5e7eb';
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast({
        title: 'Preferences Updated',
        description: 'Your preferences have been saved successfully!',
      });
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not save your preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });
}