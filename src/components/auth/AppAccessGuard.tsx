
import { useAuth } from '@/providers/AuthProvider';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen';
import { SplashScreen } from '@/components/visual/SplashScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDeepLinkRedirect } from '@/hooks/useDeepLinkRedirect';
import { useSafeStorage } from '@/hooks/useSafeStorage';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_VERSION } from '@/hooks/useOnboardingDatabase';

const ONBOARDING_KEY = 'floq_onboarding_complete';
const SPLASH_SEEN_KEY = 'floq_splash_seen';

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const { data: preferences, isLoading: loadingPrefs } = useUserPreferences();
  const queryClient = useQueryClient();
  const { getRedirectPath, clearRedirectPath } = useDeepLinkRedirect();
  const { getItem, setItem } = useSafeStorage();
  const location = useLocation();

  // Check if user is visiting a shared plan route (bypass onboarding and splash)
  const isSharedPlanRoute = location.pathname.startsWith('/share/');
  const isDirectPlanRoute = location.pathname.startsWith('/plan/');

  // Check if splash screen has been seen
  useEffect(() => {
    const checkSplashSeen = async () => {
      if (isSharedPlanRoute || isDirectPlanRoute) {
        setShowSplash(false);
        return;
      }
      
      const splashSeen = await getItem(SPLASH_SEEN_KEY);
      setShowSplash(!splashSeen);
    };
    
    checkSplashSeen();
  }, [getItem, isSharedPlanRoute, isDirectPlanRoute]);

  // Enhanced onboarding completion check with debug logging
  const { data: onboardingComplete, isLoading: onboardingLoading } = useQuery({
    queryKey: ['onboarding-complete', user?.id ?? 'anon'],
    queryFn: async () => {
      if (!user) {
        console.log('🔍 No user found, onboarding incomplete');
        return false;
      }

      console.log('🔍 Checking onboarding completion for user:', user.id);

      try {
        // Check database first - look for completed onboarding progress
        const { data: progressData, error: progressError } = await supabase
          .from('user_onboarding_progress')
          .select('completed_at, onboarding_version')
          .eq('profile_id', user.id)
          .eq('onboarding_version', ONBOARDING_VERSION)
          .maybeSingle();

        if (progressError) {
          console.error('❌ Error checking onboarding progress:', progressError);
        } else {
          console.log('📊 Onboarding progress data:', progressData);
        }

        // Check if onboarding is marked as completed in progress table
        if (progressData?.completed_at) {
          console.log('✅ Onboarding completed in progress table at:', progressData.completed_at);
          await setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
          return true;
        }

        // Fallback to preferences table check
        console.log('🔄 Checking user preferences...', preferences);
        const hasCompletedPreferences = preferences?.onboarding_version === ONBOARDING_VERSION;
        
        if (hasCompletedPreferences) {
          console.log('✅ Onboarding completed in preferences table');
          await setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
          return true;
        }

        // Final fallback to localStorage
        const stored = await getItem(ONBOARDING_KEY);
        const localStorageComplete = stored === ONBOARDING_VERSION;
        
        console.log('💾 Local storage onboarding status:', localStorageComplete);
        
        return localStorageComplete;
      } catch (error) {
        console.error('💥 Error checking onboarding status:', error);
        
        // Fallback to localStorage only on error
        const stored = await getItem(ONBOARDING_KEY);
        const fallbackComplete = stored === ONBOARDING_VERSION;
        console.log('🆘 Fallback check result:', fallbackComplete);
        return fallbackComplete;
      }
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds - reduced for more responsive updates
    gcTime: 60000, // 1 minute
  });

  // Debug logging with more detail
  console.log('[AppAccessGuard Debug]', {
    user: !!user,
    profileId: user?.id,
    preferences: !!preferences,
    preferencesVersion: preferences?.onboarding_version,
    onboardingVersion: ONBOARDING_VERSION,
    onboardingComplete,
    isSharedRoute: isSharedPlanRoute,
    isDirectRoute: isDirectPlanRoute,
    currentPath: location.pathname
  });

  if (loading || (user && loadingPrefs) || onboardingLoading || showSplash === null) {
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
    console.log('🔓 Allowing access to shared route without auth');
    return <>{children}</>;
  }

  // Show splash screen for first-time visitors (before auth)
  if (showSplash && !user) {
    console.log('✨ Showing splash screen');
    return (
      <SplashScreen
        onComplete={async () => {
          await setItem(SPLASH_SEEN_KEY, 'true');
          setShowSplash(false);
        }}
        autoTransition={false}
      />
    );
  }

  if (!user) {
    console.log('🚪 No user, showing auth screen');
    return <AuthScreen />;
  }

  // Skip onboarding for shared plan routes or if already completed
  if (!onboardingComplete && !isSharedPlanRoute && !isDirectPlanRoute) {
    console.log('📝 Showing onboarding screen');
    return (
      <EnhancedOnboardingScreen
        onComplete={async () => {
          console.log('🎯 Onboarding completion callback triggered');
          
          try {
            // Clear any stale local storage
            await setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
            
            // Invalidate queries to refresh state
            await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
            await queryClient.invalidateQueries({ queryKey: ['onboarding-complete', user?.id] });
            
            // Handle redirect
            const redirect = await getRedirectPath();
            if (redirect) {
              await clearRedirectPath();
              console.log('🔄 Redirecting to:', redirect);
              window.location.href = redirect;
            } else {
              console.log('🏠 No redirect, staying on current page');
            }
          } catch (error) {
            console.error('💥 Error in onboarding completion callback:', error);
          }
        }}
      />
    );
  }

  console.log('✅ Onboarding complete, showing main app');
  return <>{children}</>;
}
