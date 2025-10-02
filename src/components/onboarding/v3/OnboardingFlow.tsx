import { useOnboardingMachine } from '@/hooks/useOnboardingMachine';
import { WelcomeStep } from './steps/WelcomeStep';
import { ProfileVibeStep } from './steps/ProfileVibeStep';
import { LiveRevealStep } from './steps/LiveRevealStep';
import { PrivacyStep } from './steps/PrivacyStep';
import { NudgesStep } from './steps/NudgesStep';
import { CompleteStep } from './steps/CompleteStep';

type OnboardingFlowProps = {
  onComplete: () => void;
  initialStep?: number;
};

/**
 * Onboarding Flow v3 - World-class 11/10 experience
 * Orchestrates the 7-screen journey with state machine
 */
export function OnboardingFlow({ onComplete, initialStep = 0 }: OnboardingFlowProps) {
  const machine = useOnboardingMachine(initialStep);
  const { currentStep } = machine;

  switch (currentStep) {
    case 'welcome':
      return <WelcomeStep machine={machine} />;
      
    case 'profile':
    case 'vibe':
      return <ProfileVibeStep machine={machine} />;
      
    case 'permissions':
      return <LiveRevealStep machine={machine} />;
      
    case 'privacy':
      return <PrivacyStep machine={machine} />;
      
    case 'nudges':
      return <NudgesStep machine={machine} />;
      
    case 'complete':
      return <CompleteStep machine={machine} onComplete={onComplete} />;
      
    default:
      return <WelcomeStep machine={machine} />;
  }
}
