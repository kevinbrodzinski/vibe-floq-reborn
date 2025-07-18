import { useMemo } from 'react';
import { useWeeklyTrends } from '@/hooks/useWeeklyTrends';

interface StreakData {
  energyStreak: number;
  socialStreak: number;
  bothStreak: number;
  hasVisualStreak: boolean;
}

export const useStreakDetection = (): StreakData => {
  const { data: weeklyData } = useWeeklyTrends();

  return useMemo(() => {
    if (!weeklyData || weeklyData.length < 2) {
      return {
        energyStreak: 0,
        socialStreak: 0,
        bothStreak: 0,
        hasVisualStreak: false,
      };
    }

    let energyStreak = 0;
    let socialStreak = 0;
    let bothStreak = 0;

    // Count consecutive improving weeks (starting from most recent)
    for (let i = weeklyData.length - 1; i >= 0; i--) {
      const week = weeklyData[i];
      
      if (week.energy_trend === 'improving') {
        energyStreak++;
      } else if (energyStreak > 0) {
        break; // streak broken
      }
      
      if (week.social_trend === 'improving') {
        socialStreak++;
      } else if (socialStreak > 0) {
        break; // streak broken
      }
      
      if (week.energy_trend === 'improving' && week.social_trend === 'improving') {
        bothStreak++;
      } else if (bothStreak > 0) {
        break; // streak broken
      }
    }

    return {
      energyStreak,
      socialStreak,
      bothStreak,
      hasVisualStreak: bothStreak >= 3, // Show visual streak after 3+ weeks
    };
  }, [weeklyData]);
};