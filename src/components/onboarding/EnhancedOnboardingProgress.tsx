import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
const Check = lazy(() => import('lucide-react').then(m => ({ default: m.Check })));

interface Props {
  currentStep: number;
  totalSteps: number;
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
}

export function EnhancedOnboardingProgress({
  currentStep,
  totalSteps,
  completedSteps = [],
  onStepClick
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const done = completedSteps.includes(i);
          const isCurrent = i === currentStep;
          const clickable = !!onStepClick && (done || i <= currentStep);

          return (
            <motion.button
              key={i}
              onClick={() => clickable && onStepClick?.(i)}
              disabled={!clickable}
              aria-label={`Go to step ${i + 1}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              whileHover={clickable ? { scale: 1.1 } : {}}
              whileTap={clickable ? { scale: 0.95 } : {}}
              className={`w-6 h-6 rounded-full grid place-items-center text-xs transition-colors
                ${done ? 'bg-primary text-background' :
                isCurrent ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'}
              `}
            >
              <Suspense fallback={null}>
                {done ? <Check size={12} /> : i + 1}
              </Suspense>
            </motion.button>
          );
        })}
      </div>

      {/* progress bar */}
      <div className="h-1 w-full bg-muted/40 rounded">
        <div
          className="h-1 bg-primary rounded transition-all"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}