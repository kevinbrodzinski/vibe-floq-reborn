import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart } from 'lucide-react';
import { getMatchDescription, getMatchColor } from '@/utils/vibeMatch';

interface VibeMatchBadgeProps {
  matchPercentage: number;
  blendedColor?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VibeMatchBadge: React.FC<VibeMatchBadgeProps> = ({
  matchPercentage,
  blendedColor,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  const matchDescription = getMatchDescription(matchPercentage);
  const matchColorClass = getMatchColor(matchPercentage);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
        ${matchColorClass}
        ${blendedColor ? 'border' : 'bg-background/20'}
        ${className}
      `}
      style={{
        borderColor: blendedColor,
        backgroundColor: blendedColor ? `${blendedColor}20` : undefined
      }}
    >
      {showIcon && (
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {matchPercentage >= 80 ? (
            <Sparkles size={iconSize[size]} className="text-yellow-400" />
          ) : (
            <Heart size={iconSize[size]} />
          )}
        </motion.div>
      )}
      
      <span className="font-semibold">
        {Math.round(matchPercentage)}%
      </span>
      
      <span className="text-xs opacity-80">
        {matchDescription}
      </span>
    </motion.div>
  );
};

export const VibeMatchIndicator: React.FC<{
  matchPercentage: number;
  blendedColor?: string;
  compact?: boolean;
}> = ({ matchPercentage, blendedColor, compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: blendedColor || 'currentColor' }}
        />
        <span className="text-xs font-medium">
          {Math.round(matchPercentage)}%
        </span>
      </div>
    );
  }

  return (
    <VibeMatchBadge 
      matchPercentage={matchPercentage}
      blendedColor={blendedColor}
    />
  );
}; 