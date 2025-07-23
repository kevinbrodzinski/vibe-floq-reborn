
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { OnboardingLogoutButton } from './OnboardingLogoutButton';
import { OnboardingProgress } from './OnboardingProgress';

// Import all onboarding steps
import {
  OnboardingWelcomeStep,
  OnboardingVibeStep,
  OnboardingProfileStep,
  OnboardingAvatarStep,
  OnboardingFeaturesStep,
} from './steps';
import { OnboardingCompletionStep } from './OnboardingCompletionStep';

interface EnhancedOnboardingScreenProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 6;

export function EnhancedOnboardingScreen({ onComplete }: EnhancedOnboardingScreenProps) {
  const { 
    state, 
    nextStep, 
    prevStep, 
    goToStep,
    setVibe, 
    setProfile, 
    setAvatar,
    markComplete,
    isLoaded 
  } = useOnboardingProgress();

  const {
    trackOnboardingStart,
    trackStepCompleted,
    trackOnboardingCompleted,
  } = useOnboardingAnalytics();

  const [hasStarted, setHasStarted] = useState(false);

  // Track onboarding start
  useEffect(() => {
    if (isLoaded && !hasStarted) {
      trackOnboardingStart();
      setHasStarted(true);
    }
  }, [isLoaded, hasStarted, trackOnboardingStart]);

  // Don't render until data is loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading your onboarding...
          </p>
        </div>
      </div>
    );
  }

  const progressPercentage = ((state.currentStep + 1) / TOTAL_STEPS) * 100;

  const handleStepComplete = (stepData?: any) => {
    trackStepCompleted(state.currentStep, `step-${state.currentStep}`, stepData);
    
    if (state.currentStep < TOTAL_STEPS - 1) {
      nextStep();
    }
  };

  const handleOnboardingComplete = async () => {
    console.log('🎯 Enhanced onboarding completion triggered');
    
    try {
      // Mark progress as complete
      await markComplete();
      
      // Track completion
      trackOnboardingCompleted({
        total_steps: TOTAL_STEPS,
        selected_vibe: state.selectedVibe,
        profile_completed: !!state.profileData
      });
      
      console.log('✅ Enhanced onboarding completion successful, calling onComplete');
      onComplete();
      
    } catch (error) {
      console.error('💥 Error in enhanced onboarding completion:', error);
      // Still try to complete even if tracking fails
      onComplete();
    }
  };

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <OnboardingWelcomeStep 
            onNext={() => handleStepComplete()} 
          />
        );
      case 1:
        return (
          <OnboardingVibeStep
            selectedVibe={state.selectedVibe}
            onVibeSelect={setVibe}
            onNext={() => handleStepComplete({ vibe: state.selectedVibe })}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <OnboardingProfileStep
            profileData={state.profileData}
            onProfileUpdate={setProfile}
            onNext={() => handleStepComplete({ profile: state.profileData })}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <OnboardingAvatarStep
            avatarUrl={state.avatarUrl}
            onAvatarSelect={setAvatar}
            onNext={() => handleStepComplete({ avatar_set: !!state.avatarUrl })}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <OnboardingFeaturesStep
            onNext={() => handleStepComplete()}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <OnboardingCompletionStep 
            onDone={handleOnboardingComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 safe-area-inset">
      {/* Header with progress and logout */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 pt-safe-top">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
                Welcome to Floq
              </h1>
              {state.currentStep < TOTAL_STEPS - 1 && (
                <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-sm sm:max-w-md">
                  <Progress value={progressPercentage} className="flex-1 h-2" />
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">
                    {state.currentStep + 1} / {TOTAL_STEPS}
                  </span>
                </div>
              )}
            </div>
            
            <OnboardingLogoutButton 
              variant="ghost" 
              size="sm"
              className="shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Step indicator dots (except on completion step) */}
      {state.currentStep < TOTAL_STEPS - 1 && (
        <OnboardingProgress
          currentStep={state.currentStep}
          totalSteps={TOTAL_STEPS - 1}
        />
      )}
      
      {/* Bottom safe area padding */}
      <div className="pb-safe-bottom" />
    </div>
  );
}
