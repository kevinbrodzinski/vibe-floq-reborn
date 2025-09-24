import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Zap, Settings } from 'lucide-react';
import { useVibe } from '@/lib/store/useVibe';
import type { Database } from '@/integrations/supabase/types';

interface PulseHeaderProps {
  location?: {
    city?: string;
    neighborhood?: string;
  };
  onLocationClick?: () => void;
  onSettingsClick?: () => void;
  onAIInsightsClick?: () => void;
  showAIInsights?: boolean;
  className?: string;
}

type VibeEnum = Database['public']['Enums']['vibe_enum'];

const getVibeDisplayName = (vibe: VibeEnum): string => {
  const vibeNames: Record<VibeEnum, string> = {
    chill: 'chill',
    hype: 'hype',
    curious: 'curious',
    social: 'social',
    solo: 'solo',
    romantic: 'romantic',
    weird: 'weird',
    down: 'down',
    flowing: 'flowing',
    open: 'open',
    energetic: 'energetic',
    excited: 'excited',
    focused: 'focused'
  };
  return vibeNames[vibe] || 'chill';
};

const getVibeNeonColor = (vibe: VibeEnum): { primary: string; glow: string; shadow: string } => {
  const neonColors: Record<VibeEnum, { primary: string; glow: string; shadow: string }> = {
    chill: { 
      primary: '#00D4FF', 
      glow: '#00D4FF', 
      shadow: 'rgba(0, 212, 255, 0.5)' 
    },
    hype: { 
      primary: '#FF0080', 
      glow: '#FF0080', 
      shadow: 'rgba(255, 0, 128, 0.5)' 
    },
    curious: { 
      primary: '#FFD700', 
      glow: '#FFD700', 
      shadow: 'rgba(255, 215, 0, 0.5)' 
    },
    social: { 
      primary: '#00FF88', 
      glow: '#00FF88', 
      shadow: 'rgba(0, 255, 136, 0.5)' 
    },
    solo: { 
      primary: '#B19CD9', 
      glow: '#B19CD9', 
      shadow: 'rgba(177, 156, 217, 0.5)' 
    },
    romantic: { 
      primary: '#FF69B4', 
      glow: '#FF69B4', 
      shadow: 'rgba(255, 105, 180, 0.5)' 
    },
    weird: { 
      primary: '#9D4EDD', 
      glow: '#9D4EDD', 
      shadow: 'rgba(157, 78, 221, 0.5)' 
    },
    down: { 
      primary: '#6366F1', 
      glow: '#6366F1', 
      shadow: 'rgba(99, 102, 241, 0.5)' 
    },
    flowing: { 
      primary: '#00CED1', 
      glow: '#00CED1', 
      shadow: 'rgba(0, 206, 209, 0.5)' 
    },
    open: { 
      primary: '#FF6B6B', 
      glow: '#FF6B6B', 
      shadow: 'rgba(255, 107, 107, 0.5)' 
    },
    energetic: { 
      primary: '#FF4500', 
      glow: '#FF4500', 
      shadow: 'rgba(255, 69, 0, 0.5)' 
    },
    excited: { 
      primary: '#FF1493', 
      glow: '#FF1493', 
      shadow: 'rgba(255, 20, 147, 0.5)' 
    },
    focused: { 
      primary: '#32CD32', 
      glow: '#32CD32', 
      shadow: 'rgba(50, 205, 50, 0.5)' 
    }
  };
  return neonColors[vibe] || neonColors.chill;
};

export const PulseHeader: React.FC<PulseHeaderProps> = ({
  location,
  onLocationClick,
  onSettingsClick,
  onAIInsightsClick,
  showAIInsights = false,
  className = ''
}) => {
  const { currentVibe } = useVibe();
  const locationText = location?.neighborhood 
    ? `${location.neighborhood}, ${location.city || 'Unknown'}`
    : location?.city || 'Current location';

  return (
    <div className={`flex justify-between items-center p-6 pt-16 ${className}`}>
      {/* Location Button */}
      <motion.button
        className="p-2 rounded-full hover:bg-secondary/20 transition-colors group"
        onClick={onLocationClick}
        aria-label="Open location settings"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MapPin className="h-6 w-6 text-white/80 group-hover:text-white transition-colors" />
        {location && (
          <div className="absolute top-full left-0 mt-2 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-lg text-white/90 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {locationText}
          </div>
        )}
      </motion.button>

      {/* Main Pulse Title with Animated Background */}
      <div className="relative flex flex-col items-center justify-center w-full">
        {/* Animated gradient wave background */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[220px] h-12 pointer-events-none z-0">
          <motion.svg
            viewBox="0 0 220 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            animate={{
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <defs>
              <linearGradient 
                id="pulseWaveGradient" 
                x1="0" 
                y1="0" 
                x2="220" 
                y2="0" 
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#a5b4fc" />
                <stop offset="0.5" stopColor="#f472b6" />
                <stop offset="1" stopColor="#facc15" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0 24 Q 55 0 110 24 T 220 24 Q 165 48 110 24 T 0 24"
              stroke="url(#pulseWaveGradient)"
              strokeWidth="6"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                repeatType: "reverse"
              }}
            />
          </motion.svg>
        </div>

        {/* Pulse Title */}
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-300 via-pink-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          pulse
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-base md:text-lg text-white/70 font-medium z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          Discovering around you
        </motion.p>

        {/* User's Current Vibe - Compact Neon Style */}
        <motion.div
          className="flex items-center justify-center mt-2 z-10"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          {(() => {
            const vibeColors = getVibeNeonColor(currentVibe as VibeEnum);
            return (
              <div 
                className="relative px-3 py-1.5 rounded-md bg-black/30 backdrop-blur-sm border"
                style={{ 
                  borderColor: vibeColors.primary,
                  boxShadow: `
                    0 0 5px ${vibeColors.shadow},
                    0 0 10px ${vibeColors.shadow},
                    0 0 20px ${vibeColors.shadow}
                  `
                }}
              >
                {/* Neon glow effect */}
                <div 
                  className="absolute inset-0 rounded-md opacity-15"
                  style={{ 
                    background: `linear-gradient(45deg, ${vibeColors.primary}08, transparent, ${vibeColors.primary}08)`,
                  }}
                />
                
                <div className="relative flex items-center space-x-1.5">
                  <span className="text-white/70 text-xs font-medium">
                    current vibe:
                  </span>
                  <motion.span 
                    className="text-sm font-bold tracking-wide uppercase"
                    style={{ 
                      color: vibeColors.primary,
                      textShadow: `
                        0 0 3px ${vibeColors.glow},
                        0 0 6px ${vibeColors.glow},
                        0 0 10px ${vibeColors.glow}
                      `
                    }}
                    animate={{ 
                      textShadow: [
                        `0 0 3px ${vibeColors.glow}, 0 0 6px ${vibeColors.glow}, 0 0 10px ${vibeColors.glow}`,
                        `0 0 5px ${vibeColors.glow}, 0 0 10px ${vibeColors.glow}, 0 0 15px ${vibeColors.glow}`,
                        `0 0 3px ${vibeColors.glow}, 0 0 6px ${vibeColors.glow}, 0 0 10px ${vibeColors.glow}`
                      ]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    "{getVibeDisplayName(currentVibe as VibeEnum)}"
                  </motion.span>
                </div>
              </div>
            );
          })()}
        </motion.div>
      </div>

      {/* AI Insights / Settings Button */}
      <div className="flex items-center gap-2">
        {/* AI Insights Toggle */}
        <motion.button
          className={`p-2 rounded-full transition-colors ${
            showAIInsights 
              ? 'bg-yellow-500/20 text-yellow-400' 
              : 'hover:bg-secondary/20 text-white/80 hover:text-white'
          }`}
          onClick={onAIInsightsClick}
          aria-label="Toggle AI Insights"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Zap className="h-6 w-6" />
          {showAIInsights && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
        </motion.button>

        {/* Settings Button */}
        <motion.button
          className="p-2 rounded-full hover:bg-secondary/20 transition-colors"
          onClick={onSettingsClick}
          aria-label="Open settings"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings className="h-5 w-5 text-white/80 hover:text-white transition-colors" />
        </motion.button>
      </div>
    </div>
  );
};