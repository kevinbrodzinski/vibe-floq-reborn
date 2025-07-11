import React, { useState, useEffect } from 'react';
import { Achievement } from '@/hooks/useAchievements';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import * as LucideIcons from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Calendar, Trophy, Target, Users } from 'lucide-react';

interface AchievementModalProps {
  achievement: Achievement;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AchievementModal({ 
  achievement, 
  children, 
  open,
  onOpenChange 
}: AchievementModalProps) {
  const [isPreloading, setIsPreloading] = useState(false);
  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Award;
  const isRare = achievement.metadata?.rarity === 'rare' || achievement.metadata?.rarity === 'legendary';

  // Pre-fetch icons and images on hover for snappy opens
  useEffect(() => {
    if (isPreloading) {
      const img = new Image();
      if (achievement.metadata?.image_url) {
        img.src = achievement.metadata.image_url;
      }
    }
  }, [isPreloading, achievement.metadata?.image_url]);

  // Calculate rarity percentage
  const rarityPercentage = achievement.metadata?.rarity_percentage || 
    (achievement.metadata?.rarity === 'legendary' ? 1 : 
     achievement.metadata?.rarity === 'rare' ? 5 : 25);

  const familyColor = {
    explorer: 'text-blue-500',
    social: 'text-green-500',
    creator: 'text-purple-500',
    achievement: 'text-yellow-500',
  }[achievement.family] || 'text-gray-500';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <div 
          onMouseEnter={() => setIsPreloading(true)}
          className="cursor-pointer"
        >
          {children}
        </div>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          {/* Achievement Icon and Basic Info */}
          <div className="flex items-start gap-4">
            <motion.div
              className={cn(
                'w-16 h-16 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                achievement.is_earned
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground',
                isRare && achievement.is_earned && 'shadow-lg shadow-primary/30'
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <IconComponent size={32} />
              
              {/* Rare achievement glow */}
              {isRare && achievement.is_earned && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20 blur-lg"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              )}
            </motion.div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-xl font-bold">
                  {achievement.name}
                </SheetTitle>
                {achievement.is_earned && (
                  <Badge variant="default" className="text-xs">
                    ✓ Earned
                  </Badge>
                )}
                {isRare && (
                  <Badge variant="secondary" className="text-xs">
                    {achievement.metadata?.rarity || 'Rare'}
                  </Badge>
                )}
              </div>
              
              <SheetDescription className="text-sm leading-relaxed">
                {achievement.description}
              </SheetDescription>
              
              {/* Family and rarity info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy size={14} className={familyColor} />
                  <span className="capitalize">{achievement.family}</span>
                </div>
                {rarityPercentage < 10 && (
                  <div className="flex items-center gap-1">
                    <Target size={14} />
                    <span>{rarityPercentage}% of users</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {!achievement.is_earned && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">
                    {achievement.progress} / {achievement.goal}
                  </span>
                </div>
                <Progress 
                  value={achievement.progress_percentage} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {achievement.goal - achievement.progress} more to unlock
                </p>
              </div>
            </div>
          )}

          {/* Achievement Details */}
          <div className="space-y-4">
            <Separator />
            
            {/* Earned date */}
            {achievement.is_earned && achievement.earned_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Earned on</span>
                <span className="font-medium">
                  {new Date(achievement.earned_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}

            {/* Metadata breathing room */}
            {achievement.metadata && Object.keys(achievement.metadata).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Details</h4>
                <div className="space-y-2">
                  {achievement.metadata.hint && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Hint:</span>
                      <span className="ml-1">{achievement.metadata.hint}</span>
                    </div>
                  )}
                  
                  {achievement.metadata.difficulty && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Difficulty:</span>
                      <span className="ml-1 capitalize">{achievement.metadata.difficulty}</span>
                    </div>
                  )}
                  
                  {achievement.metadata.category && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="ml-1 capitalize">{achievement.metadata.category}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tips for unlocking */}
            {!achievement.is_earned && achievement.metadata?.tips && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Tips</h4>
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {Array.isArray(achievement.metadata.tips) 
                    ? achievement.metadata.tips.map((tip: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{tip}</span>
                        </div>
                      ))
                    : achievement.metadata.tips
                  }
                </div>
              </div>
            )}
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

// Hook for deep-link support
export function useAchievementDeepLink() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/achievements\/([^\/]+)/);
    if (match) {
      setSelectedCode(match[1]);
    }

    const handlePopState = () => {
      const newPath = window.location.pathname;
      const newMatch = newPath.match(/\/achievements\/([^\/]+)/);
      setSelectedCode(newMatch ? newMatch[1] : null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openAchievement = (code: string) => {
    window.history.pushState({}, '', `/achievements/${code}`);
    setSelectedCode(code);
  };

  const closeAchievement = () => {
    window.history.pushState({}, '', window.location.pathname.replace(/\/achievements\/[^\/]+/, ''));
    setSelectedCode(null);
  };

  return {
    selectedCode,
    openAchievement,
    closeAchievement,
  };
}