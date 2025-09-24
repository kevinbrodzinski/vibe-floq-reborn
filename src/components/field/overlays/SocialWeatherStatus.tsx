/**
 * Social Weather Status Bar
 * Displays current social weather conditions with smooth updates
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SocialWeatherPhrase, WeatherType } from '@/features/field/status/SocialWeatherComposer';

interface SocialWeatherStatusProps {
  phrase: SocialWeatherPhrase | null;
  className?: string;
}

const weatherTypeColors = {
  storm_front: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high_pressure: 'text-green-400 bg-green-400/10 border-green-400/20', 
  low_pressure: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  clearing: 'text-slate-300 bg-slate-300/10 border-slate-300/20',
} as const;

export function SocialWeatherStatus({ phrase, className = '' }: SocialWeatherStatusProps) {
  const [displayPhrase, setDisplayPhrase] = useState<SocialWeatherPhrase | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (phrase) {
      setDisplayPhrase(phrase);
    }
  }, [phrase]);

  if (!displayPhrase) return null;

  const colorClasses = weatherTypeColors[displayPhrase.type];
  const intensityOpacity = Math.max(0.6, displayPhrase.intensity);

  return (
    <motion.div
      className={`pointer-events-auto ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: intensityOpacity, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className={`
          rounded-lg border backdrop-blur-sm px-3 py-2 
          max-w-xs transition-all duration-300 cursor-pointer
          ${colorClasses}
        `}
        style={{ 
          opacity: intensityOpacity,
          transform: `scale(${0.95 + displayPhrase.intensity * 0.05})` 
        }}
        onClick={() => setShowDetail(!showDetail)}
      >
        {/* Main status line */}
        <div className="flex items-center gap-2">
          <motion.span
            className="text-lg"
            animate={{ 
              scale: displayPhrase.intensity > 0.7 ? [1, 1.1, 1] : 1 
            }}
            transition={{ 
              duration: 2, 
              repeat: displayPhrase.intensity > 0.7 ? Infinity : 0 
            }}
          >
            {displayPhrase.emoji}
          </motion.span>
          
          <motion.span 
            className="text-sm font-medium leading-tight"
            key={displayPhrase.headline} // Re-animate on text change
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {displayPhrase.headline}
          </motion.span>
        </div>

        {/* Intensity indicator */}
        {displayPhrase.intensity > 0.6 && (
          <motion.div 
            className="mt-1 h-1 rounded-full bg-current opacity-40"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: displayPhrase.intensity }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}

        {/* Detail text (expandable) */}
        <AnimatePresence>
          {showDetail && displayPhrase.detail && (
            <motion.div
              className="mt-2 text-xs opacity-80 leading-relaxed"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {displayPhrase.detail}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap indicator */}
        {displayPhrase.detail && (
          <div className="absolute top-1 right-1">
            <motion.div
              className="w-1 h-1 rounded-full bg-current opacity-30"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Compact version for mobile/small screens
 */
export function SocialWeatherStatusCompact({ phrase }: SocialWeatherStatusProps) {
  if (!phrase) return null;

  const colorClasses = weatherTypeColors[phrase.type];

  return (
    <motion.div
      className="flex items-center gap-2 pointer-events-auto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: phrase.intensity * 0.8 + 0.2, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className={`rounded-full px-2 py-1 ${colorClasses}`}>
        <span className="text-sm">{phrase.emoji}</span>
      </div>
      
      {phrase.intensity > 0.5 && (
        <motion.div
          className="text-xs text-white/70 max-w-24 truncate"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {phrase.headline.split(' ')[0]} {/* First word only */}
        </motion.div>
      )}
    </motion.div>
  );
}