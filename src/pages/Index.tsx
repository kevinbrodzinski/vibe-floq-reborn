import { FloqApp } from "@/components/FloqApp";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
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
      <OnboardingScreen 
        onComplete={() => {
          // The hook will automatically refetch and hide onboarding
          window.location.reload();
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
