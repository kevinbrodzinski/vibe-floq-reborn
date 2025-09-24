import * as React from 'react';
import { Slider } from '@/components/ui/slider';

type Props = {
  valueKm: number;
  onChange: (km: number) => void;
  minKm?: number;
  maxKm?: number;
  stepKm?: number;
  className?: string;
};

export default function DistanceRadiusPicker({
  valueKm,
  onChange,
  minKm = 0.2,
  maxKm = 5,
  stepKm = 0.1,
  className
}: Props) {
  return (
    <div className={className ?? ''}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/80">Radius</span>
        <span className="text-sm font-medium">{valueKm.toFixed(1)} km</span>
      </div>
      <Slider
        value={[valueKm]}
        min={minKm}
        max={maxKm}
        step={stepKm}
        onValueChange={(v) => onChange(v[0] ?? valueKm)}
        className="w-full"
      />
    </div>
  );
}