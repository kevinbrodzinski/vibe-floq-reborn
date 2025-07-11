import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Achievement } from '@/hooks/useAchievements';
import * as LucideIcons from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface MiniBadgeProps {
  achievement: Achievement;
  variant?: 'icon-only' | 'progress-ring';
  size?: 'xs' | 'sm' | 'md';
  priority?: 'normal' | 'high'; // For vibe ring collision detection
  className?: string;
}

export function MiniBadge({ 
  achievement, 
  variant = 'icon-only',
  size = 'sm',
  priority = 'normal',
  className 
}: MiniBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Award;

  // IntersectionObserver for performance optimization
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const sizeConfig = {
    xs: { container: 'w-6 h-6', icon: 12, ring: 8 },
    sm: { container: 'w-8 h-8', icon: 16, ring: 10 },
    md: { container: 'w-10 h-10', icon: 20, ring: 12 },
  };

  const config = sizeConfig[size];
  const isRare = achievement.metadata?.rarity === 'rare' || achievement.metadata?.rarity === 'legendary';
  const showProgress = variant === 'progress-ring' && !achievement.is_earned && achievement.progress > 0;

  if (!isVisible) {
    return <div ref={ref} className={cn(config.container, className)} />;
  }

  const badgeContent = (
    <motion.div
      ref={ref}
      className={cn(
        'relative flex items-center justify-center rounded-full border transition-all duration-200',
        config.container,
        achievement.is_earned
          ? 'border-primary bg-primary/10 text-primary'
          : showProgress
          ? 'border-muted-foreground/50 bg-muted/30 text-muted-foreground'
          : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground/60',
        priority === 'high' && 'z-10',
        isRare && achievement.is_earned && 'shadow-md shadow-primary/30',
        className
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      {/* Progress ring for in-progress achievements */}
      {showProgress && (
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r={config.ring}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground/20"
          />
          <motion.circle
            cx="12"
            cy="12"
            r={config.ring}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-primary"
            style={{
              strokeDasharray: `${2 * Math.PI * config.ring}`,
            }}
            initial={{ strokeDashoffset: 2 * Math.PI * config.ring }}
            animate={{ 
              strokeDashoffset: 2 * Math.PI * config.ring * (1 - achievement.progress_percentage / 100)
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
      )}

      {/* Achievement icon */}
      <IconComponent size={config.icon} className="relative z-10" />

      {/* Earned indicator */}
      {achievement.is_earned && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border border-background"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
        />
      )}

      {/* Rare achievement glow effect */}
      {isRare && achievement.is_earned && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20 blur-sm"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center space-y-1">
            <p className="font-medium text-sm">{achievement.name}</p>
            <p className="text-xs text-muted-foreground max-w-40 leading-snug">
              {achievement.description}
            </p>
            {showProgress && (
              <p className="text-xs text-primary">
                {achievement.progress} / {achievement.goal}
              </p>
            )}
            {achievement.is_earned && achievement.earned_at && (
              <p className="text-xs text-muted-foreground">
                Earned {new Date(achievement.earned_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Optimized list component for rendering many mini badges
export function MiniBadgeList({ 
  achievements, 
  maxVisible = 5,
  className 
}: { 
  achievements: Achievement[];
  maxVisible?: number;
  className?: string;
}) {
  const earnedAchievements = achievements.filter(a => a.is_earned).slice(0, maxVisible);
  const remainingCount = Math.max(0, achievements.filter(a => a.is_earned).length - maxVisible);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {earnedAchievements.map((achievement) => (
        <MiniBadge
          key={achievement.code}
          achievement={achievement}
          size="xs"
        />
      ))}
      {remainingCount > 0 && (
        <div className="w-6 h-6 rounded-full bg-muted/50 border border-muted-foreground/30 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  );
}