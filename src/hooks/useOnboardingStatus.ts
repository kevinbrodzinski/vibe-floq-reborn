
import { useUserPreferences, useUpdateUserPreferences } from './useUserPreferences';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_CONFLICT_COLUMNS } from '@/constants/onboarding';

export interface OnboardingStatus {
  needsOnboarding: boolean;
  isLoading: boolean;
  currentVersion: string;
  completedVersion?: string;
  markCompleted: () => Promise<void>;
}

/**
 * Hook to check if user needs to complete onboarding
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { user } = useAuth();
  const { data: preferences, isLoading: loadingPrefs } = useUserPreferences();
  const { mutateAsync: updatePreferences } = useUpdateUserPreferences();
  const queryClient = useQueryClient();

  // Check onboarding completion status from database
  const { data: progressData, isLoading: loadingProgress } = useQuery({
    queryKey: ['onboarding-progress', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .select('completed_at, onboarding_version')
        .eq('profile_id', user.id)
        .eq('onboarding_version', CURRENT_ONBOARDING_VERSION)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching onboarding progress:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user,
  });

  const isLoading = loadingPrefs || loadingProgress;
  
  // User needs onboarding if:
  // 1. No completed onboarding progress record, AND
  // 2. No preferences record with current version
  const needsOnboarding = !progressData?.completed_at && 
    (!preferences?.onboarding_version || preferences.onboarding_version !== CURRENT_ONBOARDING_VERSION);

  const markCompleted = async () => {
    if (!user) {
      throw new Error('No authenticated user');
    }

    console.log('🎯 Marking onboarding as completed for user:', user.id);

    try {
      const completionTime = new Date().toISOString();

      // Update both tables for consistency
      const [progressResult, preferencesResult] = await Promise.allSettled([
        supabase.from('user_onboarding_progress').upsert({
          profile_id: user.id,
          onboarding_version: CURRENT_ONBOARDING_VERSION,
          current_step: 6,
          completed_steps: [0, 1, 2, 3, 4, 5],
          completed_at: completionTime
        }, {
          onConflict: ONBOARDING_CONFLICT_COLUMNS
        }),
        
        updatePreferences({
          onboarding_version: CURRENT_ONBOARDING_VERSION,
          onboarding_completed_at: completionTime,
        })
      ]);

      // Check results
      if (progressResult.status === 'rejected') {
        console.error('Failed to update onboarding progress:', progressResult.reason);
      }
      
      if (preferencesResult.status === 'rejected') {
        console.error('Failed to update preferences:', preferencesResult.reason);
      }

      // If at least one succeeded, consider it successful
      if (progressResult.status === 'fulfilled' || preferencesResult.status === 'fulfilled') {
        console.log('✅ Onboarding marked as completed');
        
        // Invalidate queries to refresh state
        await queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
        await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
        
      } else {
        throw new Error('Failed to update both onboarding records');
      }

    } catch (error) {
      console.error('💥 Error marking onboarding as completed:', error);
      throw error;
    }
  };

  return {
    needsOnboarding,
    isLoading,
    currentVersion: CURRENT_ONBOARDING_VERSION,
    completedVersion: preferences?.onboarding_version,
    markCompleted,
  };
}
