import React from 'react';
import { motion } from 'framer-motion';

interface HeroCardProps {
  title: string;
  subtitle: string;
  isActive?: boolean;
  onPress: () => void;
  showParticles?: boolean;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  title,
  subtitle,
  isActive = false,
  onPress,
  showParticles = false
}) => {
  return (
    <motion.div
      className={`
        relative h-64 rounded-2xl overflow-hidden cursor-pointer
        bg-[color:var(--card)] border border-[color:var(--border)]
        ${isActive ? 'ring-2 ring-[color:var(--primary)]/30' : ''}
        ${showParticles ? 'bg-gradient-to-br from-[color:var(--card)] to-[color:var(--card)]/80' : ''}
      `}
      onClick={onPress}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect for active card */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--primary)]/5 to-transparent" />
      )}
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-[color:var(--foreground)]">
            {title}
          </h3>
          <p className="text-[color:var(--muted-foreground)]">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-4 right-4 w-3 h-3 bg-[color:var(--primary)] rounded-full animate-pulse" />
      )}
    </motion.div>
  );
};