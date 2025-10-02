
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen';
import { SplashScreen } from '@/components/visual/SplashScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, startTransition, Suspense } from 'react';
import { useDeepLinkRedirect } from '@/hooks/useDeepLinkRedirect';
import { useSafeStorage } from '@/hooks/useSafeStorage';
import { useLocation } from 'react-router-dom';
import { ONBOARDING_VERSION } from '@/hooks/useOnboardingDatabase';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';

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
  
  // V3 onboarding gate (replaces old check)
  const onboardingGate = useOnboardingGate();

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

  // Debug logging optimized to prevent infinite loops
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppAccessGuard Debug v3]', {
        user: !!user,
        profileId: user?.id,
        needsOnboarding: onboardingGate.needsOnboarding,
        stepIndex: onboardingGate.stepIndex,
        gateVersion: onboardingGate.currentVersion,
        isSharedRoute: isSharedPlanRoute,
        isDirectRoute: isDirectPlanRoute,
        currentPath: location.pathname
      });
    }
  }, [user?.id, onboardingGate.needsOnboarding, onboardingGate.stepIndex, isSharedPlanRoute, isDirectPlanRoute, location.pathname]);

  // Show loading state with proper error handling
  if (loading || (user && loadingPrefs) || (user && onboardingGate.isLoading) || showSplash === null) {
    return <AppLoadingFallback message={
      loading ? "Authenticating..." :
      loadingPrefs ? "Loading preferences..." :
      onboardingGate.isLoading ? "Loading your progress..." :
      "Initializing..."
    } />;
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

  // V3 onboarding gate: use server-authoritative check
  const shouldShowOnboarding = onboardingGate.needsOnboarding && !isSharedPlanRoute && !isDirectPlanRoute;
  
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
              queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
              queryClient.invalidateQueries({ queryKey: ['onboarding-gate-v3', user?.id] });
            });
            
            // Handle redirect
            const redirect = await getRedirectPath();
            if (redirect) {
              await clearRedirectPath();
              console.log('🔄 Redirecting to:', redirect);
              window.location.href = redirect;
            } else {
              console.log('🏠 No redirect, navigating to main app');
              window.location.href = '/floqs';
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
