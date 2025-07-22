
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { zIndex } from '@/constants/z';

interface TimeWarpSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  isVisible?: boolean;
  onClose?: () => void;
  onTimeChange?: () => void;
}

export const TimeWarpSlider: React.FC<TimeWarpSliderProps> = ({
  value = 50,
  onChange = () => {},
  min = 0,
  max = 100,
  step = 1,
  className = "",
  isVisible,
  onClose,
  onTimeChange
}) => {
  return (
    <div 
      {...zIndex('timewarp')}
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm rounded-xl p-4 border border-border/20 shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Time Warp
        </span>
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={min}
          max={max}
          step={step}
          className="w-32"
        />
        <span className="text-sm font-mono text-muted-foreground min-w-[3ch]">
          {value}%
        </span>
      </div>
    </div>
  );
};
