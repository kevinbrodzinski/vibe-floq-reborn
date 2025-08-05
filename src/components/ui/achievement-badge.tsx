import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as LucideIcons from 'lucide-react';
import { Achievement } from '@/hooks/useAchievements';
import { motion } from 'framer-motion';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AchievementBadge({ 
  achievement, 
  size = 'md', 
  showProgress = false,
  onClick,
  className
}: AchievementBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  // Get the Lucide icon dynamically
  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Award;
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const isRare = achievement.metadata?.rarity === 'rare' || achievement.metadata?.rarity === 'legendary';
  const isClickable = !!onClick;

  return (
    <motion.div 
      className={cn("flex flex-col items-center gap-2", className)}
      whileHover={isClickable ? { scale: 1.05 } : {}}
      whileTap={isClickable ? { scale: 0.95 } : {}}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        onClick={onClick}
        className={cn(
          'relative rounded-full border-2 flex items-center justify-center transition-all duration-200',
          sizeClasses[size],
          achievement.is_earned
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground',
          isClickable && 'cursor-pointer hover:shadow-lg',
          isRare && achievement.is_earned && 'shadow-md shadow-primary/30',
          isHovered && isClickable && 'border-primary/60'
        )}
        animate={isHovered && isClickable ? { y: -2 } : { y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <IconComponent size={iconSizes[size]} />
        
        {/* Rare achievement glow effect */}
        {isRare && achievement.is_earned && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/10 blur-md"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        
        {/* Earned indicator */}
        {achievement.is_earned && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
          />
        )}
      </motion.div>
      
      <div className="text-center space-y-1">
        <div className="flex items-center gap-1 justify-center">
          <p className={cn(
            'font-medium text-center',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {achievement.name}
          </p>
          {achievement.is_earned && (
            <Badge variant="default" className="text-xs px-1 py-0">
              ✓
            </Badge>
          )}
          {isRare && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {achievement.metadata?.rarity || 'Rare'}
            </Badge>
          )}
        </div>
        
        <p className={cn(
          'text-muted-foreground',
          size === 'sm' ? 'text-xs' : 'text-xs'
        )}>
          {achievement.description}
        </p>
        
        {showProgress && !achievement.is_earned && achievement.progress > 0 && (
          <div className="w-full space-y-1">
            <Progress 
              value={achievement.progress_percentage} 
              className="h-1"
            />
            <p className="text-xs text-muted-foreground">
              {achievement.progress} / {achievement.goal}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}