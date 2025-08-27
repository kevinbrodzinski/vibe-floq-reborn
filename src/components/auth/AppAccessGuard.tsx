
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen';
import { SplashScreen } from '@/components/visual/SplashScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, startTransition, Suspense } from 'react';
import { useDeepLinkRedirect } from '@/hooks/useDeepLinkRedirect';
import { useSafeStorage } from '@/hooks/useSafeStorage';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_VERSION } from '@/hooks/useOnboardingDatabase';

const ONBOARDING_KEY = 'floq_onboarding_complete';
const SPLASH_SEEN_KEY = 'floq_splash_seen';

// Loading component for suspense fallback
const AppLoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  </div>
);

function AppAccessGuardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const { data: preferences, isLoading: loadingPrefs } = useUserPreferences(user?.id);
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
      try {
        if (isSharedPlanRoute || isDirectPlanRoute) {
          startTransition(() => {
            setShowSplash(false);
          });
          return;
        }
        
        const splashSeen = await getItem(SPLASH_SEEN_KEY);
        startTransition(() => {
          setShowSplash(!splashSeen);
        });
      } catch (error) {
        console.error('Error checking splash status:', error);
        startTransition(() => {
          setShowSplash(false);
        });
      }
    };
    
    checkSplashSeen();
  }, [getItem, isSharedPlanRoute, isDirectPlanRoute]);

  // Enhanced onboarding completion check with proper error handling
  const { data: onboardingComplete, isLoading: onboardingLoading, error: onboardingError } = useQuery({
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
          .eq('profile_id', user.id as any)
          .eq('onboarding_version', ONBOARDING_VERSION as any)
          .maybeSingle();

        if (progressError) {
          console.error('❌ Error checking onboarding progress:', progressError);
        } else {
          console.log('📊 Onboarding progress data:', progressData);
        }

        // Check if onboarding is marked as completed in progress table
        if ((progressData as any)?.completed_at) {
          console.log('✅ Onboarding completed in progress table at:', (progressData as any).completed_at);
          await setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
          return true;
        }

        // Fallback to preferences table check
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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Prevent suspension during navigation
    
    throwOnError: false
  });

  // Debug logging optimized to prevent infinite loops
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppAccessGuard Debug]', {
        user: !!user,
        profileId: user?.id,
        preferences: !!preferences,
        preferencesVersion: preferences?.onboarding_version,
        onboardingVersion: ONBOARDING_VERSION,
        onboardingComplete,
        onboardingError,
        isSharedRoute: isSharedPlanRoute,
        isDirectRoute: isDirectPlanRoute,
        currentPath: location.pathname
      });
    }
  }, [user?.id, preferences?.onboarding_version, onboardingComplete, onboardingError, isSharedPlanRoute, isDirectPlanRoute, location.pathname]);

  // Show loading state with proper error handling
  if (loading || (user && loadingPrefs) || onboardingLoading || showSplash === null) {
    return <AppLoadingFallback message={
      loading ? "Authenticating..." :
      loadingPrefs ? "Loading preferences..." :
      onboardingLoading ? "Loading your progress..." :
      "Initializing..."
    } />;
  }

  // Handle onboarding query errors gracefully
  if (onboardingError) {
    console.error('Onboarding check error:', onboardingError);
    // Fallback to assuming onboarding is not complete
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
          try {
            await setItem(SPLASH_SEEN_KEY, 'true');
            startTransition(() => {
              setShowSplash(false);
            });
          } catch (error) {
            console.error('Error saving splash completion:', error);
            startTransition(() => {
              setShowSplash(false);
            });
          }
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
  // Use fallback to false if there was an error checking onboarding status
  const shouldShowOnboarding = !onboardingComplete && !onboardingError && !isSharedPlanRoute && !isDirectPlanRoute;
  
  if (shouldShowOnboarding) {
    console.log('📝 Showing onboarding screen');
    return (
      <EnhancedOnboardingScreen
        onComplete={async () => {
          console.log('🎯 Onboarding completion callback triggered');
          
          try {
            // Clear any stale local storage
            await setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
            
            // Use startTransition for state updates
            startTransition(() => {
              // Invalidate queries to refresh state
              queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
              queryClient.invalidateQueries({ queryKey: ['onboarding-complete', user?.id] });
            });
            
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

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppLoadingFallback message="Loading application..." />}>
      <AppAccessGuardContent>
        {children}
      </AppAccessGuardContent>
    </Suspense>
  );
}
