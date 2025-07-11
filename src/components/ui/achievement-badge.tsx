import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as LucideIcons from 'lucide-react';
import { Achievement } from '@/hooks/useAchievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function AchievementBadge({ 
  achievement, 
  size = 'md', 
  showProgress = false 
}: AchievementBadgeProps) {
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

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'rounded-full border-2 flex items-center justify-center transition-all',
          sizeClasses[size],
          achievement.is_earned
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground'
        )}
      >
        <IconComponent size={iconSizes[size]} />
      </div>
      
      <div className="text-center space-y-1">
        <div className="flex items-center gap-1">
          <p className={cn(
            'font-medium',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {achievement.name}
          </p>
          {achievement.is_earned && (
            <Badge variant="default" className="text-xs px-1 py-0">
              ✓
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
    </div>
  );
}