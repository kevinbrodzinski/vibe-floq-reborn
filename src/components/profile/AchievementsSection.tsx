import { AchievementBadge } from '@/components/ui/achievement-badge';
import { useAchievements } from '@/hooks/useAchievements';
import { Loader2 } from 'lucide-react';

export function AchievementsSection() {
  const { data: achievements, isLoading, error } = useAchievements();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Failed to load achievements</p>
      </div>
    );
  }

  if (!achievements || achievements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No achievements available</p>
      </div>
    );
  }

  const earnedAchievements = achievements.filter(a => a.is_earned);
  const inProgressAchievements = achievements.filter(a => !a.is_earned && a.progress > 0);
  const lockedAchievements = achievements.filter(a => !a.is_earned && a.progress === 0);

  return (
    <div className="space-y-6">
      {earnedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Earned Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {earnedAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.code}
                achievement={achievement}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {inProgressAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">In Progress</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {inProgressAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.code}
                achievement={achievement}
                size="md"
                showProgress={true}
              />
            ))}
          </div>
        </div>
      )}

      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {lockedAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.code}
                achievement={achievement}
                size="md"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}