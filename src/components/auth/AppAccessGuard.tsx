
import { useAuth } from '@/providers/AuthProvider';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDeepLinkRedirect } from '@/hooks/useDeepLinkRedirect';
import { useSafeStorage } from '@/hooks/useSafeStorage';

const ONBOARDING_KEY = 'floq_onboarding_complete';
const ONBOARDING_VERSION = 'v2';

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: preferences, isLoading: loadingPrefs } = useUserPreferences();
  const queryClient = useQueryClient();
  const { getRedirectPath, clearRedirectPath } = useDeepLinkRedirect();
  const { getItem, setItem } = useSafeStorage();

  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const hasCompleted = preferences?.onboarding_version === ONBOARDING_VERSION;

  useEffect(() => {
    const loadOnboardingState = async () => {
      const stored = await getItem(ONBOARDING_KEY);
      if (stored === ONBOARDING_VERSION) {
        setOnboardingComplete(true);
      } else {
        setOnboardingComplete(false);
      }
    };
    loadOnboardingState();
  }, [getItem]);

  useEffect(() => {
    if (hasCompleted) {
      setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
      setOnboardingComplete(true);
    }
  }, [hasCompleted, setItem]);

  // Debug logging
  console.log('[AppAccessGuard Debug]', {
    user: !!user,
    preferences,
    onboardingVersion: ONBOARDING_VERSION,
    hasCompleted,
    onboardingComplete,
    currentDbVersion: preferences?.onboarding_version
  });

  if (loading || (user && loadingPrefs) || onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!onboardingComplete) {
    return (
      <EnhancedOnboardingScreen
        onComplete={async () => {
          await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
          await setItem(ONBOARDING_KEY, ONBOARDING_VERSION);

          const redirect = await getRedirectPath();
          if (redirect) {
            await clearRedirectPath();
            window.location.href = redirect;
          } else {
            setOnboardingComplete(true);
          }
        }}
      />
    );
  }

  return <>{children}</>;
}
