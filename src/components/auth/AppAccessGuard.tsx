
import { useAuth } from '@/providers/AuthProvider';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDeepLinkRedirect } from '@/hooks/useDeepLinkRedirect';
import { useSafeStorage } from '@/hooks/useSafeStorage';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'floq_onboarding_complete';
const ONBOARDING_VERSION = 'v2';

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: preferences, isLoading: loadingPrefs } = useUserPreferences();
  const queryClient = useQueryClient();
  const { getRedirectPath, clearRedirectPath } = useDeepLinkRedirect();
  const { getItem, setItem } = useSafeStorage();
  const location = useLocation();

  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const hasCompleted = preferences?.onboarding_version === ONBOARDING_VERSION;

  // Check if user is visiting a shared plan route (bypass onboarding)
  const isSharedPlanRoute = location.pathname.startsWith('/share/');
  const isDirectPlanRoute = location.pathname.startsWith('/plan/');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setOnboardingComplete(null);
        return;
      }

      // Check database first
      const { data } = await supabase
        .from('user_onboarding_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('onboarding_version', ONBOARDING_VERSION)
        .maybeSingle();

      if (data?.completed_at) {
        setOnboardingComplete(true);
        setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
        return;
      }

      // Fallback to preferences and localStorage
      if (hasCompleted) {
        setOnboardingComplete(true);
        setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
        return;
      }

      const stored = await getItem(ONBOARDING_KEY);
      if (stored === ONBOARDING_VERSION) {
        setOnboardingComplete(true);
      } else {
        setOnboardingComplete(false);
      }
    };

    checkOnboardingStatus();
  }, [user, hasCompleted, getItem, setItem]);

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

  // Allow access to shared routes without authentication
  if (!user && isSharedPlanRoute) {
    return <>{children}</>;
  }

  if (!user) return <AuthScreen />;

  // Skip onboarding for shared plan routes or if already completed
  if (!onboardingComplete && !isSharedPlanRoute && !isDirectPlanRoute) {
    return (
      <EnhancedOnboardingScreen
        onComplete={async () => {
          // Mark as complete in database
          if (user) {
            await supabase
              .from('user_onboarding_progress')
              .upsert({
                user_id: user.id,
                onboarding_version: ONBOARDING_VERSION,
                current_step: 6,
                completed_steps: [0, 1, 2, 3, 4, 5],
                completed_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,onboarding_version'
              });
          }

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
