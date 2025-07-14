import React from 'react';
import { 
  Armchair, 
  Users2, 
  Zap, 
  Waves, 
  HeartHandshake, 
  User, 
  Coffee, 
  CloudRain, 
  HandHeart, 
  Eye 
} from 'lucide-react';
import { vibeColor } from '@/utils/vibe';
import type { Database } from '@/integrations/supabase/types';

type Vibe = Database['public']['Enums']['vibe_enum'];

const vibeIconMap = {
  chill: Armchair,
  social: Users2,
  hype: Zap,
  flowing: Waves,
  romantic: HeartHandshake,
  solo: User,
  weird: Coffee,
  down: CloudRain,
  open: HandHeart,
  curious: Eye
} as const;

interface VibeIconProps {
  vibe: Vibe;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VibeIcon: React.FC<VibeIconProps> = ({ 
  vibe, 
  size = 'md',
  className = '' 
}) => {
  const Icon = vibeIconMap[vibe] || Users2;
  const accent = vibeColor(vibe);
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-14 w-14', 
    lg: 'h-20 w-20'
  };
  
  const iconSizes = {
    sm: 16,
    md: 28,
    lg: 40
  };

  return (
    <div
      className={`relative shrink-0 rounded-full flex items-center justify-center ${sizeClasses[size]} ${className}`}
      style={{
        '--vibe-from': accent,
        background: `radial-gradient(circle at 30% 30%, ${accent} 0%, transparent 70%)`,
        boxShadow: `0 0 18px ${accent}40`
      } as React.CSSProperties}
    >
      <Icon 
        size={iconSizes[size]} 
        className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" 
        aria-hidden="true"
      />
      
      {/* Outer pulse ring */}
      <span 
        className="absolute inset-0 rounded-full border animate-pulse"
        style={{ borderColor: `${accent}50` }}
        aria-hidden="true"
      />
    </div>
  );
};