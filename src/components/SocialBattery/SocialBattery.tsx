import React, { useState, useMemo } from 'react';
import { Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFieldHeartbeat } from '@/hooks/useFieldHeartbeat';
import SocialBatterySheet from './SocialBatterySheet';

export type SocialBatteryProps = {
  size?: number;
  envelope?: 'strict' | 'balanced' | 'permissive';
  onRallyNow?: () => void | Promise<void>;
  onMeetHalfway?: () => void | Promise<void>;
};

export default function SocialBattery({
  size = 52,
  envelope = 'balanced',
  onRallyNow,
  onMeetHalfway,
}: SocialBatteryProps) {
  const p = useFieldHeartbeat({ envelope });
  const [open, setOpen] = useState(false);
  
  // Calculate energy metrics
  const energy = p.energy;
  const pct = Math.round(energy * 100);
  
  // Determine trend direction from slope and momentum
  const dir = useMemo(() => {
    if (p.slope > 0.1) return 'rising';
    if (p.slope < -0.1) return 'falling';
    return 'stable';
  }, [p.slope]);
  
  // Energy-based styling
  const energyColor = useMemo(() => {
    if (energy > 0.7) return 'hsl(var(--primary))';
    if (energy > 0.3) return 'hsl(45, 100%, 60%)';
    return 'hsl(0, 70%, 60%)';
  }, [energy]);
  
  const TrendIcon = dir === 'rising' ? TrendingUp : dir === 'falling' ? TrendingDown : Minus;
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative p-2 flex items-center gap-3"
        aria-label={`Social Battery: ${pct}% ${dir}`}
      >
        {/* Energy Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div 
            className="absolute inset-0 rounded-full border-2 transition-colors duration-500"
            style={{
              borderColor: energyColor,
              background: `conic-gradient(${energyColor} ${pct}%, transparent ${pct}%)`,
              mask: 'radial-gradient(circle at center, transparent 65%, black 67%)',
              WebkitMask: 'radial-gradient(circle at center, transparent 65%, black 67%)'
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-5 h-5" style={{ color: energyColor }} />
          </div>
        </div>
        
        {/* Status Pills */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{pct}%</span>
            <TrendIcon 
              className="w-3 h-3" 
              style={{ color: energyColor }}
            />
          </div>
          <div className="text-xs text-muted-foreground capitalize">{dir}</div>
        </div>
      </Button>
      
      <SocialBatterySheet
        open={open}
        onClose={() => setOpen(false)}
        energy={energy}
        dir={dir}
        onRallyNow={onRallyNow}
        onMeetHalfway={onMeetHalfway}
      />
    </>
  );
}