import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { vibeOptions, getVibeMeta } from '@/lib/vibeConstants';
import { type Vibe } from '@/lib/vibes';

interface VibeSelectionStepProps {
  onNext: (vibe: Vibe) => void;
  onBack?: () => void;
}

export function VibeSelectionStep({ onNext, onBack }: VibeSelectionStepProps) {
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);

  const handleVibeSelect = (vibe: Vibe) => {
    setSelectedVibe(vibe);
  };

  const handleNext = () => {
    if (selectedVibe) {
      onNext(selectedVibe);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Primary Vibe</h2>
        <p className="text-muted-foreground">
          This helps us personalize your experience and connect you with like-minded people
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {vibeOptions.map((vibe) => {
          const isSelected = selectedVibe === vibe.id;
          const meta = getVibeMeta(vibe.id);
          
          return (
            <Card
              key={vibe.id}
              className={`cursor-pointer transition-all hover:scale-105 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleVibeSelect(vibe.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{vibe.emoji}</div>
                <div className="font-semibold text-sm mb-1">{vibe.label}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {meta.energy} energy • {meta.social}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedVibe && (
        <Card className="max-w-md mx-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {getVibeMeta(selectedVibe).emoji} {getVibeMeta(selectedVibe).label} Vibe
            </CardTitle>
            <CardDescription>
              Perfect for {getVibeMeta(selectedVibe).energy} energy moments and {getVibeMeta(selectedVibe).social} experiences
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex gap-3 max-w-md mx-auto">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button 
          onClick={handleNext} 
          disabled={!selectedVibe}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}