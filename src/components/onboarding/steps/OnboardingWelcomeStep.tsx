import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface OnboardingWelcomeStepProps {
  onNext: () => void;
}

export function OnboardingWelcomeStep({ onNext }: OnboardingWelcomeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Welcome to Floq
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Discover spontaneous moments and connect with like-minded people in your area through shared vibes.
        </p>
      </div>
      
      <Button onClick={onNext} size="lg" className="mt-8">
        Get Started
      </Button>
    </motion.div>
  );
}