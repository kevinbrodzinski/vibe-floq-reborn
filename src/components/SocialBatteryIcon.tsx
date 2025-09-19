import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface SocialBatteryIconProps {
  onPress: () => void;
  level?: number; // 0-100, for future battery level display
}

export function SocialBatteryIcon({ onPress, level = 75 }: SocialBatteryIconProps) {
  return (
    <Button
      variant="ghost" 
      size="sm"
      onClick={onPress}
      className="relative p-2"
      aria-label="Co-presence actions"
    >
      <div className="relative">
        <Zap className="w-5 h-5" />
        {/* Battery level ring - subtle indicator */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          style={{
            background: `conic-gradient(hsl(var(--primary)) ${level}%, transparent ${level}%)`
          }}
        />
      </div>
    </Button>
  );
}