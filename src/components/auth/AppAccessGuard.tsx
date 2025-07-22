
import { useAuth } from '@/providers/AuthProvider';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDeepLinkRedirect } from '@/hooks/useDeepLinkRedirect';
import { useSafeStorage } from '@/hooks/useSafeStorage';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_VERSION } from '@/hooks/useOnboardingDatabase';

const ONBOARDING_KEY = 'floq_onboarding_complete';

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: preferences, isLoading: loadingPrefs } = useUserPreferences();
  const queryClient = useQueryClient();
  const { getRedirectPath, clearRedirectPath } = useDeepLinkRedirect();
  const { getItem, setItem } = useSafeStorage();
  const location = useLocation();

  const hasCompleted = preferences?.onboarding_version === ONBOARDING_VERSION;

  // Check if user is visiting a shared plan route (bypass onboarding)
  const isSharedPlanRoute = location.pathname.startsWith('/share/');
  const isDirectPlanRoute = location.pathname.startsWith('/plan/');

  // Cached onboarding status check  
  const { data: onboardingComplete, isLoading: onboardingLoading } = useQuery({
    queryKey: ['onboarding-complete', user?.id ?? 'anon'],
    queryFn: async () => {
      if (!user) return false;

      try {
        // Check database first
        const { data } = await supabase
          .from('user_onboarding_progress')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('onboarding_version', ONBOARDING_VERSION)
          .maybeSingle();

        if (data?.completed_at) {
          setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
          return true;
        }

        // Fallback to preferences and localStorage
        if (hasCompleted) {
          setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
          return true;
        }

        const stored = await getItem(ONBOARDING_KEY);
        return stored === ONBOARDING_VERSION;
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        const stored = await getItem(ONBOARDING_KEY);
        return stored === ONBOARDING_VERSION;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Debug logging
  console.log('[AppAccessGuard Debug]', {
    user: !!user,
    preferences,
    onboardingVersion: ONBOARDING_VERSION,
    hasCompleted,
    onboardingComplete,
    currentDbVersion: preferences?.onboarding_version
  });

  if (loading || (user && loadingPrefs) || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          {onboardingLoading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading your progress...
            </p>
          )}
        </div>
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
          await queryClient.invalidateQueries({ queryKey: ['onboarding-complete', user?.id] });
          await setItem(ONBOARDING_KEY, ONBOARDING_VERSION);

          const redirect = await getRedirectPath();
          if (redirect) {
            await clearRedirectPath();
            window.location.href = redirect;
          }
        }}
      />
    );
  }

  return <>{children}</>;
}
