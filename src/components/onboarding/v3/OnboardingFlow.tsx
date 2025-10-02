import { useOnboardingMachine } from '@/hooks/useOnboardingMachine';
import { OnboardingShell } from './OnboardingShell';
import {
  WelcomeScreen,
  SetupScreen,
  FieldRevealScreen,
  FriendImportScreen,
  PatternScreen,
  PrivacyScreen,
  ArchetypeScreen,
} from './screens';

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

  const renderScreen = () => {
    switch (machine.currentStep) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'profile':
        return <SetupScreen />;
      case 'vibe':
        return <FieldRevealScreen />;
      case 'permissions':
        return <FriendImportScreen />;
      case 'privacy':
        return <PatternScreen />;
      case 'nudges':
        return <PrivacyScreen />;
      case 'complete':
        return <ArchetypeScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <OnboardingShell 
      machine={machine} 
      onComplete={onComplete}
      nextLabel={machine.stepIndex === 6 ? 'Start My Journey' : undefined}
    >
      {renderScreen()}
    </OnboardingShell>
  );
}
