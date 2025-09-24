import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

interface RadiusSliderProps {
  km: number;
  onChange: (km: number) => void;
}

export function RadiusSlider({ km, onChange }: RadiusSliderProps) {
  const [localValue, setLocalValue] = useState(km);

  return (
    <div className="px-4 py-3 border-b border-border/30">
      <div className="text-xs text-muted-foreground mb-2 font-medium">
        Walking radius ({localValue.toFixed(2)} km)
      </div>
      <Slider
        min={0.25}
        max={3}
        step={0.25}
        value={[localValue]}
        onValueChange={([value]) => setLocalValue(value)}
        onValueCommit={([value]) => onChange(value)}
        className="w-full"
      />
    </div>
  );
}