import { useMemo } from 'react';

export interface VibeContextData {
  timestamp: Date;
  hourOfDay: number;
  timeOfDay: 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late-night';
  isWeekend: boolean;
  dayOfWeek: number;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  isHoliday?: boolean;
}

/**
 * Provides real contextual data for vibe analysis
 * Replaces mock context data with actual time-based calculations
 */
export const useVibeContext = (): VibeContextData => {
  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();
    
    // Determine time of day based on hour
    const getTimeOfDay = (hour: number): VibeContextData['timeOfDay'] => {
      if (hour >= 0 && hour < 6) return 'late-night';
      if (hour >= 6 && hour < 8) return 'early-morning';
      if (hour >= 8 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    };
    
    // Determine season based on month (Northern Hemisphere)
    const getSeason = (month: number): VibeContextData['season'] => {
      if (month >= 2 && month <= 4) return 'spring';
      if (month >= 5 && month <= 7) return 'summer';
      if (month >= 8 && month <= 10) return 'fall';
      return 'winter';
    };
    
    // Check if it's weekend (Saturday = 6, Sunday = 0)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    return {
      timestamp: now,
      hourOfDay: hour,
      timeOfDay: getTimeOfDay(hour),
      isWeekend,
      dayOfWeek,
      season: getSeason(month),
      // Could add holiday detection here with a holiday API or static list
      isHoliday: false
    };
  }, []); // Recalculate only when component mounts or hour changes
};