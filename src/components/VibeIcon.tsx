import React from 'react';
import { 
  Armchair, 
  Users, 
  Zap, 
  Waves, 
  Heart, 
  User, 
  Sparkles, 
  CloudRain, 
  HandHeart, 
  Eye 
} from 'lucide-react';
import { vibeColor, vibeGradient } from '@/utils/vibe';
import type { Database } from '@/integrations/supabase/types';

type Vibe = Database['public']['Enums']['vibe_enum'];

const vibeIconMap = {
  chill: Armchair,
  social: Users,
  hype: Zap,
  flowing: Waves,
  romantic: Heart,
  solo: User,
  weird: Sparkles,
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
  const Icon = vibeIconMap[vibe] || Users;
  const accent = vibeColor(vibe);
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-20 w-20', 
    lg: 'h-24 w-24'
  };
  
  const iconSizes = {
    sm: 16,
    md: 40,
    lg: 48
  };

  return (
    <div
      className={`relative inline-grid place-items-center rounded-full ${sizeClasses[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${accent}40, ${accent}20)`,
        color: accent,
        border: `2px solid ${accent}50`
      }}
    >
      <Icon 
        size={iconSizes[size]} 
        className="relative z-20 drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" 
        aria-hidden="true"
      />
      
      {/* Animated glow rings */}
      <div 
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, ${accent}30, transparent 60%)`,
          filter: 'blur(8px)',
          transform: 'scale(1.2)'
        }}
        aria-hidden="true"
      />
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${accent}15, transparent 40%)`,
          filter: 'blur(16px)',
          transform: 'scale(1.6)',
          animation: 'pulse 3s ease-in-out infinite'
        }}
        aria-hidden="true"
      />
    </div>
  );
};