import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { FINAL_STEP_INDEX } from '@/constants/onboarding';
import type { OnboardingMachine } from '@/hooks/useOnboardingMachine';

type Props = {
  machine: OnboardingMachine;
  children: ReactNode;
  onComplete?: () => void;
  nextLabel?: string;
  backLabel?: string;
};

export function OnboardingShell({ machine, children, onComplete, nextLabel, backLabel }: Props) {
  const { stepIndex, canGoBack, canGoNext, isAdvancing, goNext, goBack, markComplete } = machine;
  const atFinal = stepIndex === FINAL_STEP_INDEX;
  const lastBeforeFinal = stepIndex === FINAL_STEP_INDEX - 1;
  const denom = Math.max(FINAL_STEP_INDEX, 1);
  const progressPercent = Math.round((stepIndex / denom) * 100);

  async function handleNext() {
    if (lastBeforeFinal) {
      await markComplete();
      onComplete?.();
    } else {
      await goNext();
    }
  }

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
              {backLabel ?? 'Back'}
            </Button>
          ) : (
            <div />
          )}

          {!atFinal && canGoNext && (
            <Button
              onClick={handleNext}
              disabled={isAdvancing}
              className="gap-2"
            >
              {lastBeforeFinal ? (nextLabel ?? 'Complete') : (nextLabel ?? 'Next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Step: {stepIndex}/{FINAL_STEP_INDEX}
        </div>
      )}
    </div>
  );
}
