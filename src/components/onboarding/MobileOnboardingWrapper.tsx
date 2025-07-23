import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MobileOnboardingWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-first wrapper for onboarding steps
 * Handles safe area, keyboard avoidance, and responsive layout
 */
export function MobileOnboardingWrapper({ 
  children, 
  className = '' 
}: MobileOnboardingWrapperProps) {
  return (
    <div className={`
      min-h-screen 
      w-full 
      relative 
      overflow-hidden
      safe-area-inset-top 
      safe-area-inset-bottom
      ${className}
    `}>
      {/* Keyboard avoidance space */}
      <div className="
        flex 
        flex-col 
        min-h-screen 
        pb-safe-bottom 
        pt-safe-top
        px-4 
        sm:px-6 
        lg:px-8
      ">
        {/* Content container with proper spacing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="
            flex-1 
            flex 
            flex-col 
            justify-center 
            py-8 
            sm:py-12 
            lg:py-16
            max-w-lg 
            mx-auto 
            w-full
          "
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Mobile-optimized step content container
 */
export function OnboardingStepContent({ 
  children, 
  className = '' 
}: MobileOnboardingWrapperProps) {
  return (
    <div className={`
      space-y-6 
      sm:space-y-8 
      text-center
      ${className}
    `}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized button group for onboarding
 */
export function OnboardingButtonGroup({ 
  children, 
  className = '' 
}: MobileOnboardingWrapperProps) {
  return (
    <div className={`
      flex 
      flex-col 
      sm:flex-row 
      gap-3 
      sm:gap-4 
      mt-8 
      sm:mt-12
      ${className}
    `}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized progress indicator
 */
interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

export function OnboardingProgress({ 
  currentStep, 
  totalSteps, 
  onStepClick 
}: OnboardingProgressProps) {
  return (
    <div className="
      flex 
      items-center 
      justify-center 
      gap-2 
      sm:gap-3 
      py-4
      fixed 
      bottom-4 
      left-1/2 
      transform 
      -translate-x-1/2
      bg-background/80 
      backdrop-blur-sm 
      border 
      border-border/50 
      rounded-full 
      px-4 
      py-2
      shadow-lg
    ">
      {Array.from({ length: totalSteps }, (_, index) => (
        <button
          key={index}
          onClick={() => onStepClick?.(index)}
          disabled={index > currentStep}
          aria-label={`Go to step ${index + 1}`}
          className={`
            w-2 
            h-2 
            sm:w-3 
            sm:h-3 
            rounded-full 
            transition-all 
            duration-200 
            ${index === currentStep
              ? 'bg-primary scale-125 shadow-md'
              : index < currentStep
              ? 'bg-primary/60 hover:bg-primary/80 cursor-pointer'
              : 'bg-muted-foreground/30 cursor-not-allowed'
            }
          `}
        />
      ))}
    </div>
  );
}