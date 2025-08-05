import { CheckCircle } from 'lucide-react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles?: string[];
}

export function OnboardingProgress({ currentStep, totalSteps, stepTitles }: OnboardingProgressProps) {
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex justify-center space-x-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div
              key={index}
              className={`transition-all duration-300 ${
                isCurrent 
                  ? 'w-8 h-2 bg-primary rounded-full' 
                  : isCompleted
                  ? 'w-2 h-2 bg-primary rounded-full'
                  : 'w-2 h-2 bg-muted rounded-full'
              }`}
            />
          );
        })}
      </div>

      {/* Step counter */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>

      {/* Step titles if provided */}
      {stepTitles && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2 text-sm">
            {stepTitles.map((title, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center space-x-1 ${
                    isCurrent ? 'text-primary font-medium' : 
                    isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/50'
                  }`}>
                    {isCompleted && (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{title}</span>
                  </div>
                  {index < stepTitles.length - 1 && (
                    <div className="mx-2 w-8 h-px bg-muted" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}