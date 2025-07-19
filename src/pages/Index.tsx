import { FloqApp } from "@/components/FloqApp";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { EnhancedOnboardingScreen } from "@/components/onboarding/EnhancedOnboardingScreen";
import { useAuth } from "@/providers/AuthProvider";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

const Index = () => {
  const { user, loading } = useAuth();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboardingStatus();

  if (loading || (user && onboardingLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (needsOnboarding) {
    return (
      <EnhancedOnboardingScreen 
        onComplete={() => {
          // The completion step will handle the state update
          // No need for page reload - React Query will handle the refetch
        }} 
      />
    );
  }

  return (
    <AuthGuard>
      <FloqApp />
    </AuthGuard>
  );
};

export default Index;
