import { useNavigate } from 'react-router-dom';
import { OnboardingFlow } from '@/components/onboarding/v3/OnboardingFlow';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

/**
 * Onboarding Page - Entry point for v3 flow
 * Handles completion and redirect to home
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const onboardingGate = useOnboardingGate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleComplete = async () => {
    // Invalidate gate query to refresh status
    await queryClient.invalidateQueries({ 
      queryKey: ['onboarding-gate-v3', user?.id] 
    });
    
    // Navigate to home
    navigate('/home', { replace: true });
  };

  return (
    <OnboardingFlow 
      onComplete={handleComplete}
      initialStep={onboardingGate.stepIndex}
    />
  );
}
