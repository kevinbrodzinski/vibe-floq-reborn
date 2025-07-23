import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

const VIBE_OPTIONS = [
  { id: 'chill', label: 'Chill', emoji: '😌', description: 'Relaxed and easy-going' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡', description: 'High energy and active' },
  { id: 'romantic', label: 'Romantic', emoji: '💕', description: 'Looking for connection' },
  { id: 'wild', label: 'Wild', emoji: '🎉', description: 'Ready to party' },
  { id: 'cozy', label: 'Cozy', emoji: '🏠', description: 'Intimate and comfortable' },
  { id: 'deep', label: 'Deep', emoji: '🌊', description: 'Meaningful conversations' },
];

interface OnboardingVibeStepProps {
  selectedVibe: string | null;
  onVibeSelect: (vibe: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingVibeStep({ selectedVibe, onVibeSelect, onNext, onBack }: OnboardingVibeStepProps) {
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
        {VIBE_OPTIONS.map((vibe) => (
          <motion.button
            key={vibe.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onVibeSelect(vibe.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedVibe === vibe.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="text-2xl mb-2">{vibe.emoji}</div>
            <div className="font-semibold">{vibe.label}</div>
            <div className="text-xs text-muted-foreground">{vibe.description}</div>
          </motion.button>
        ))}
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!selectedVibe}>
          Continue
        </Button>
      </div>
    </motion.div>
  );
}