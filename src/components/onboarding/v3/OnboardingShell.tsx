import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

interface OnboardingShellProps {
  machine: OnboardingMachine;
  children: React.ReactNode;
  onComplete?: () => void;
}

/**
 * Shell component for onboarding v3
 * Provides: progress indicator, next/back buttons, analytics wrapper
 */
export function OnboardingShell({ machine, children, onComplete }: OnboardingShellProps) {
  const { currentStep, stepIndex, canGoBack, canGoNext, isAdvancing, goNext, goBack } = machine;

  const progressPercent = Math.round((stepIndex / 6) * 100);

  const handleNext = async () => {
    if (stepIndex === 5) {
      // Last step before complete
      await machine.markComplete();
      onComplete?.();
    } else {
      await goNext();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {children}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          {canGoBack ? (
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={isAdvancing}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {canGoNext && (
            <Button
              onClick={handleNext}
              disabled={isAdvancing}
              className="gap-2"
            >
              {stepIndex === 5 ? 'Complete' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Step: {currentStep} ({stepIndex}/6)
        </div>
      )}
    </div>
  );
}
