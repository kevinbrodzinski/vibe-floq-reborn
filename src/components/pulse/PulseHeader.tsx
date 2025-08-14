import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserVibe } from '@/hooks/useUserVibe';
import { getVibeColorPalette } from '@/lib/vibeColors';
import { cn } from '@/lib/utils';

interface PulseHeaderProps {
  onProfileClick?: () => void;
}

export const PulseHeader: React.FC<PulseHeaderProps> = ({ onProfileClick }) => {
  const { user, profile } = useAuth();
  const { data: userVibe } = useUserVibe(profile?.id || null);
  
  // Get vibe colors for aura effect
  const currentVibe = userVibe?.vibe || 'chill';
  const vibeColors = getVibeColorPalette(currentVibe);
  const primaryVibeColor = vibeColors[0];
  
  // Floq logo SVG component
  const FloqLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-white">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8"/>
      <circle cx="16" cy="16" r="8" fill="currentColor" opacity="0.6"/>
      <circle cx="16" cy="16" r="4" fill="currentColor"/>
    </svg>
  );

  return (
    <div className="flex justify-between items-center p-6 pt-16">
      {/* Floq Logo - Left */}
      <div className="flex items-center">
        <FloqLogo />
      </div>

      {/* Pulse Title - Center */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Animated gradient wave background */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[220px] h-12 pointer-events-none z-0 animate-pulse-wave">
          <svg viewBox="0 0 220 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="pulseWaveGradient" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a5b4fc" />
                <stop offset="0.5" stopColor="#f472b6" />
                <stop offset="1" stopColor="#facc15" />
              </linearGradient>
            </defs>
            <path 
              d="M0 24 Q 55 0 110 24 T 220 24 Q 165 48 110 24 T 0 24" 
              stroke="url(#pulseWaveGradient)" 
              strokeWidth="6" 
              fill="none" 
              opacity="0.18"
            />
          </svg>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-300 via-pink-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg z-10">
          pulse
        </h1>
        <p className="text-base md:text-lg text-white/70 font-medium z-10">Discovering around you</p>
      </div>

      {/* Profile Icon with Vibe Aura - Right */}
      <div className="relative">
        <button
          onClick={onProfileClick}
          className="relative p-2 rounded-full transition-all duration-300 hover:scale-105"
        >
          {/* Vibe Aura Effect */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full animate-pulse opacity-30 blur-sm",
              "ring-2 ring-offset-2 ring-offset-transparent"
            )}
            style={{ 
              backgroundColor: primaryVibeColor,
              boxShadow: `0 0 20px ${primaryVibeColor}40, 0 0 40px ${primaryVibeColor}20`
            }}
          />
          
          {/* Profile Avatar or Default Icon */}
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt="Profile"
              className="w-8 h-8 rounded-full relative z-10 border-2 border-white/20"
            />
          ) : (
            <User className="w-8 h-8 text-white/80 relative z-10" />
          )}
        </button>
        
        {/* Vibe Label */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span 
            className="text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm border border-white/20"
            style={{ 
              backgroundColor: `${primaryVibeColor}20`,
              color: primaryVibeColor,
              borderColor: `${primaryVibeColor}40`
            }}
          >
            {currentVibe}
          </span>
        </div>
      </div>
    </div>
  );
};