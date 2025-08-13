import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Zap, Settings } from 'lucide-react';
import { useVibe } from '@/lib/store/useVibe';
import { VIBE_COLORS } from '@/lib/vibes';

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

const getVibeDisplayName = (vibe: string): string => {
  const vibeNames: Record<string, string> = {
    chill: 'Chill',
    flowing: 'Flowing',
    romantic: 'Romantic',
    hype: 'Hype',
    weird: 'Weird',
    solo: 'Solo',
    social: 'Social',
    open: 'Open',
    down: 'Down',
    curious: 'Curious'
  };
  return vibeNames[vibe] || 'Chill';
};

const getVibeEmoji = (vibe: string): string => {
  const vibeEmojis: Record<string, string> = {
    chill: '😌',
    flowing: '🌊',
    romantic: '💕',
    hype: '🔥',
    weird: '🤪',
    solo: '🧘',
    social: '🎉',
    open: '✨',
    down: '🌙',
    curious: '🤔'
  };
  return vibeEmojis[vibe] || '😌';
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

        {/* User's Current Vibe */}
        <motion.div
          className="flex items-center justify-center mt-2 z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "backOut" }}
        >
          <div 
            className="flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-xl border border-white/20"
            style={{ 
              background: `linear-gradient(135deg, ${VIBE_COLORS[currentVibe as keyof typeof VIBE_COLORS]}20, ${VIBE_COLORS[currentVibe as keyof typeof VIBE_COLORS]}10)`,
              boxShadow: `0 0 20px ${VIBE_COLORS[currentVibe as keyof typeof VIBE_COLORS]}40`
            }}
          >
            <motion.span 
              className="text-lg"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {getVibeEmoji(currentVibe)}
            </motion.span>
            <div className="flex flex-col items-center">
              <span 
                className="text-sm font-bold"
                style={{ color: VIBE_COLORS[currentVibe as keyof typeof VIBE_COLORS] }}
              >
                {getVibeDisplayName(currentVibe)}
              </span>
              <span className="text-xs text-white/60">vibe</span>
            </div>
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: VIBE_COLORS[currentVibe as keyof typeof VIBE_COLORS] }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
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