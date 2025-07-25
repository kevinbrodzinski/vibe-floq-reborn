import React from 'react';
import { Trophy, Target, Coffee, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProfileAchievementsProps {
  className?: string;
}

export const ProfileAchievements: React.FC<ProfileAchievementsProps> = ({
  className
}) => {
  // Mock achievements data - replace with real data
  const achievements = {
    points: 1250,
    level: 8,
    currentStreak: 3,
    unlocked: [
      {
        id: 'coffee-connoisseur',
        name: 'Coffee Connoisseur',
        icon: Coffee,
        description: 'Visited 5 coffee shops'
      }
    ],
    inProgress: [
      {
        id: 'venue-explorer',
        name: 'Venue Explorer',
        icon: MapPin,
        description: 'Visit 10 different venues',
        progress: 7,
        total: 10
      },
      {
        id: 'social-butterfly',
        name: 'Social Butterfly',
        icon: Users,
        description: 'Join 5 floqs',
        progress: 3,
        total: 5
      }
    ]
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Points and Level */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium">{achievements.points} pts</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          Level {achievements.level}
        </Badge>
      </div>

      {/* Current Streak */}
      {achievements.currentStreak > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm">{achievements.currentStreak} day streak!</span>
        </div>
      )}

      {/* Unlocked Badges */}
      {achievements.unlocked.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Unlocked Badges
          </h4>
          <div className="space-y-2">
            {achievements.unlocked.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg"
              >
                <badge.icon className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In Progress */}
      {achievements.inProgress.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            In Progress
          </h4>
          <div className="space-y-3">
            {achievements.inProgress.map((achievement) => (
              <div key={achievement.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <achievement.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{achievement.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {achievement.progress}/{achievement.total}
                  </span>
                </div>
                <Progress
                  value={(achievement.progress / achievement.total) * 100}
                  className="h-1"
                />
                <p className="text-xs text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 