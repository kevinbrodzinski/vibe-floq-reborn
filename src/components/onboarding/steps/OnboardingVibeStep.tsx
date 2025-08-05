import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { MobileOptimizedButton } from '@/components/mobile/MobileOptimizedButton';
import { VIBES, type Vibe } from '@/lib/vibes';
import { toast } from '@/hooks/use-toast';
import { vibeOptions, getVibeMeta } from '@/lib/vibeConstants';

interface OnboardingVibeStepProps {
  selectedVibe: string | null;
  onVibeSelect: (vibe: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingVibeStep({ selectedVibe, onVibeSelect, onNext, onBack }: OnboardingVibeStepProps) {
  const handleContinue = () => {
    if (!selectedVibe) {
      toast({ title: 'Pick a vibe first', variant: 'destructive' });
      return;
    }
    if (!VIBES.includes(selectedVibe as Vibe)) {
      toast({
        title: 'Invalid vibe selected',
        description: 'Please pick one of the listed vibe options.',
        variant: 'destructive',
      });
      return;
    }
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What's your vibe?</h2>
        <p className="text-muted-foreground">
          Choose the energy that best represents you
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {vibeOptions.map((vibe) => (
          <motion.button
            key={vibe.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (selectedVibe !== vibe.id) onVibeSelect(vibe.id);
            }}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedVibe === vibe.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="text-2xl mb-2">{vibe.emoji}</div>
            <div className="font-semibold">{vibe.label}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {getVibeMeta(vibe.id).energy} energy • {getVibeMeta(vibe.id).social}
            </div>
          </motion.button>
        ))}
      </div>
      
      <div className="flex justify-between pt-4 gap-3">
        <MobileOptimizedButton 
          variant="ghost" 
          onClick={onBack}
          hapticType="light"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </MobileOptimizedButton>
        <MobileOptimizedButton 
          onClick={handleContinue} 
          disabled={!selectedVibe}
          hapticType="medium"
          className="flex-1"
        >
          Continue
        </MobileOptimizedButton>
      </div>
    </motion.div>
  );
}