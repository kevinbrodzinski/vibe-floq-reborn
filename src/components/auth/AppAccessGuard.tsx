
import { useAuth } from '@/hooks/useAuth';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnhancedOnboardingScreen } from '@/components/onboarding/EnhancedOnboardingScreen';
import { SplashScreen } from '@/components/visual/SplashScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDeepLinkRedirect } from '@/hooks/useDeepLinkRedirect';
import { useSafeStorage } from '@/hooks/useSafeStorage';
import { useLocation } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

const SPLASH_SEEN_KEY = 'floq_splash_seen';

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboardingStatus();
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

  // Use the centralized onboarding status hook
  const onboardingComplete = !needsOnboarding;

  // Debug logging for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppAccessGuard]', {
        user: !!user,
        needsOnboarding,
        isSharedRoute: isSharedPlanRoute
      });
    }
  }, [user?.id, needsOnboarding, isSharedPlanRoute]);

  if (loading || onboardingLoading || showSplash === null) {
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

  // Show splash screen for first-time visitors (before auth)
  if (showSplash && !user) {
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
    return <AuthScreen />;
  }

  // Skip onboarding for shared plan routes or if already completed
  if (needsOnboarding && !isSharedPlanRoute && !isDirectPlanRoute) {
    return (
      <EnhancedOnboardingScreen
        onComplete={async () => {
          try {
            // Invalidate queries to refresh state
            await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
            await queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
            
            // Handle redirect
            const redirect = await getRedirectPath();
            if (redirect) {
              await clearRedirectPath();
              window.location.href = redirect;
            }
          } catch (error) {
            console.error('Error in onboarding completion:', error);
          }
        }}
      />
    );
  }

  return <>{children}</>;
}
