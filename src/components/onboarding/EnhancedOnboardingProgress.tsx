import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';

// Dynamic import for Check icon to reduce bundle size
const Check = lazy(() => import('lucide-react').then(m => ({ default: m.Check })));

interface EnhancedOnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

export function EnhancedOnboardingProgress({ 
  currentStep, 
  totalSteps, 
  onStepClick,
  completedSteps = [] 
}: EnhancedOnboardingProgressProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/50 safe-area-bottom">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index;
            const isCompleted = completedSteps.includes(stepNumber);
            const isCurrent = stepNumber === currentStep;
            const isClickable = onStepClick && (isCompleted || stepNumber <= currentStep);
            
            return (
              <motion.button
                key={stepNumber}
                className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-full transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && !isCompleted && 'bg-primary/20 border-2 border-primary',
                  !isCurrent && !isCompleted && 'bg-muted text-muted-foreground',
                  isClickable && 'hover:scale-110 cursor-pointer',
                  !isClickable && 'cursor-default'
                )}
                onClick={() => isClickable && onStepClick?.(stepNumber)}
                disabled={!isClickable}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {isCompleted ? (
                  <Suspense fallback={<CheckCircle2 className="w-5 h-5" />}>
                    <Check className="w-5 h-5" />
                  </Suspense>
                ) : (
                  <span className="text-sm font-medium">{stepNumber + 1}</span>
                )}
                
                {/* Current step indicator */}
                {isCurrent && (
                  <motion.div
                    className="absolute -inset-1 rounded-full border-2 border-primary"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-primary to-primary-glow h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
}