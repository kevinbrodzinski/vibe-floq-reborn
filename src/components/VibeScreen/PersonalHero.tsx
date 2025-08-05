import React from 'react';
import { motion } from 'framer-motion';
import { useSensorStats } from '@/hooks/useSensorStats';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { getVibeColor } from '@/utils/getVibeColor';
import { usePulseTime } from '@/hooks/usePulseTime';
import { cn } from '@/lib/utils';

export const PersonalHero: React.FC = () => {
  const { accuracy, sound } = useSensorStats();
  const vibe = useCurrentVibe();
  const pulseTime = usePulseTime(3); // 3 second pulse cycle
  
  // Convert pulse time to smooth sine wave (0→1→0)
  const pulseScale = 1 + Math.sin(pulseTime * Math.PI) * 0.1;
  
  // Streak calculation (mock for now)
  const streakDays = 4;
  
  // Motion detection (mock)
  const isMoving = sound > 60;
  const motionBadgeColor = isMoving ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' : 'bg-blue-500/20 text-blue-300 border-blue-400/30';
  
  return (
    <motion.div 
      className="flex items-center gap-2 px-3 py-2 bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl mx-3 mb-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Accuracy Ring */}
      <div className="relative">
        <motion.div 
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
          style={{
            borderColor: getVibeColor((vibe as string) || 'chill'),
            scale: pulseScale,
          }}
        >
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getVibeColor((vibe as string) || 'chill') }}
          />
        </motion.div>
        
        {/* Accuracy percentage overlay */}
        <div className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full px-1">
          <span className="text-[10px] font-medium text-foreground">
            {Math.round(accuracy * 100)}%
          </span>
        </div>
      </div>

      {/* Vibe Status */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold capitalize text-foreground">
            {(vibe as string) || 'chill'}
          </h3>
          {streakDays > 0 && (
            <div className="flex items-center gap-1 text-orange-400">
              <span className="text-xs">🔥</span>
              <span className="text-xs font-medium">{streakDays}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Learning accuracy {Math.round(accuracy * 100)}%
        </p>
      </div>

      {/* Sensor Data */}
      <div className="flex flex-col items-end gap-2">
        <div className="text-xs text-muted-foreground">
          🔊 {sound} dB
        </div>
        <div className={cn(
          "px-2 py-1 rounded-full border text-xs font-medium transition-colors",
          motionBadgeColor
        )}>
          {isMoving ? '🚶 moving' : '🧘 still'}
        </div>
      </div>
    </motion.div>
  );
};