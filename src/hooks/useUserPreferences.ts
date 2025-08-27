import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPreferences {
  profile_id: string;
  preferred_vibe: string;
  vibe_color: string;
  vibe_strength: number;
  checkin_streak: number;
  favorite_locations: string[];
  feedback_sentiment: Record<string, any>;
  prefer_smart_suggestions: boolean;
  field_enabled: boolean;
  onboarding_version?: string;
  onboarding_completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch user preferences
 */
export function useUserPreferences(profileId?: string) {
  return useQuery<UserPreferences | null>({
    queryKey: ['user-preferences', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!profileId) return null
      const { data, error } = await supabase
        .from('user_preferences')
        .select('checkin_streak, prefer_smart_suggestions, preferred_vibe, onboarding_version')
        .eq('profile_id', profileId as any)
        .maybeSingle()

      if (error) throw error
      return (data as UserPreferences) ?? null
    },
    staleTime: 300000, // 5 minutes
    throwOnError: false,
    retry: 2
  })
}

/**
 * Hook to get vibe colors mapping
 */
export function getVibeColor(vibe: string): string {
  const vibeColors: Record<string, string> = {
    chill: 'hsl(var(--chart-2))',
    energetic: 'hsl(var(--chart-3))',
    romantic: 'hsl(var(--chart-5))',
    wild: 'hsl(var(--chart-4))',
    cozy: 'hsl(var(--chart-1))',
    deep: 'hsl(var(--chart-6))',
  };
  return vibeColors[vibe] || 'hsl(var(--muted-foreground))';
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const { data, error } = await supabase.functions.invoke('update-settings', {
        body: { 
          target: 'preferences',
          updates
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      // Only show toast for user-initiated updates, not onboarding completion
      if (!queryClient.getQueryData(['suppress-toast'])) {
        toast({
          title: 'Preferences Updated',
          description: 'Your preferences have been saved successfully!',
        });
      }
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