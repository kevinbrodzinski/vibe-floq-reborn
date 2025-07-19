import { useUserPreferences, useUpdateUserPreferences } from './useUserPreferences';

const CURRENT_ONBOARDING_VERSION = 'v2';

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
  const { data: preferences, isLoading } = useUserPreferences();
  const { mutateAsync: updatePreferences } = useUpdateUserPreferences();
  
  const needsOnboarding = !preferences?.onboarding_version || 
    preferences.onboarding_version !== CURRENT_ONBOARDING_VERSION;

  const markCompleted = async () => {
    await updatePreferences({
      onboarding_version: CURRENT_ONBOARDING_VERSION,
      onboarding_completed_at: new Date().toISOString(),
    });
  };

  return {
    needsOnboarding,
    isLoading,
    currentVersion: CURRENT_ONBOARDING_VERSION,
    completedVersion: preferences?.onboarding_version,
    markCompleted,
  };
}