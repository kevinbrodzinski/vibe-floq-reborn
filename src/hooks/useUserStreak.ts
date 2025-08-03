import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakType: 'location' | 'social' | 'activity';
}

export const useUserStreak = (profileId: string | undefined) => {
  return useQuery({
    queryKey: ['user-streak', profileId],
    queryFn: async (): Promise<UserStreak | null> => {
      if (!profileId) return null;
      
      try {
        // Get activity data from multiple sources to calculate streaks
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Get presence activity (location-based streak)
        const { data: presenceData } = await supabase
          .from('presence')
          .select('created_at, updated_at')
          .eq('profile_id', profileId)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        // 2. Get floq participation (social streak)
        const { data: floqData } = await supabase
          .from('flock_participants')
          .select('joined_at, flock_id')
          .eq('profile_id', profileId)
          .gte('joined_at', thirtyDaysAgo.toISOString())
          .order('joined_at', { ascending: false });

        // 3. Get venue check-ins (activity streak)
        const { data: venueData } = await supabase
          .from('venue_live_presence')
          .select('checked_in_at')
          .eq('profile_id', profileId)
          .gte('checked_in_at', thirtyDaysAgo.toISOString())
          .order('checked_in_at', { ascending: false });

        // Combine all activity dates
        const allActivities: Date[] = [];
        
        if (presenceData) {
          presenceData.forEach(p => {
            allActivities.push(new Date(p.created_at));
            if (p.updated_at !== p.created_at) {
              allActivities.push(new Date(p.updated_at));
            }
          });
        }

        if (floqData) {
          floqData.forEach(f => allActivities.push(new Date(f.joined_at)));
        }

        if (venueData) {
          venueData.forEach(v => allActivities.push(new Date(v.checked_in_at)));
        }

        if (allActivities.length === 0) {
          return {
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: new Date().toISOString(),
            streakType: 'activity'
          };
        }

        // Sort activities by date (most recent first)
        allActivities.sort((a, b) => b.getTime() - a.getTime());

        // Group activities by day
        const dailyActivity = new Map<string, Date[]>();
        allActivities.forEach(date => {
          const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          if (!dailyActivity.has(dayKey)) {
            dailyActivity.set(dayKey, []);
          }
          dailyActivity.get(dayKey)!.push(date);
        });

        // Calculate current streak
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];
        
        // Check if active today or yesterday (to account for timezone differences)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];
        
        let currentDate = new Date(today);
        let hasActivityToday = dailyActivity.has(todayKey);
        
        // Start from today or yesterday if there's activity
        if (!hasActivityToday && dailyActivity.has(yesterdayKey)) {
          currentDate = yesterday;
          hasActivityToday = true;
        }

        // Calculate current streak going backwards
        if (hasActivityToday) {
          while (true) {
            const dateKey = currentDate.toISOString().split('T')[0];
            if (dailyActivity.has(dateKey)) {
              currentStreak++;
              tempStreak++;
              longestStreak = Math.max(longestStreak, tempStreak);
            } else {
              break;
            }
            
            // Move to previous day
            currentDate.setDate(currentDate.getDate() - 1);
            
            // Don't go beyond our data range
            if (currentDate < thirtyDaysAgo) break;
          }
        }

        // Calculate longest streak in the period
        const sortedDays = Array.from(dailyActivity.keys()).sort();
        tempStreak = 0;
        
        for (let i = 0; i < sortedDays.length; i++) {
          if (i === 0) {
            tempStreak = 1;
          } else {
            const prevDate = new Date(sortedDays[i - 1]);
            const currDate = new Date(sortedDays[i]);
            const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 1) {
              tempStreak++;
            } else {
              tempStreak = 1;
            }
          }
          longestStreak = Math.max(longestStreak, tempStreak);
        }

        // Determine streak type based on most common activity
        let streakType: 'location' | 'social' | 'activity' = 'activity';
        const locationCount = presenceData?.length || 0;
        const socialCount = floqData?.length || 0;
        const venueCount = venueData?.length || 0;

        if (locationCount >= socialCount && locationCount >= venueCount) {
          streakType = 'location';
        } else if (socialCount >= venueCount) {
          streakType = 'social';
        }

        return {
          currentStreak,
          longestStreak,
          lastActiveDate: allActivities[0].toISOString(),
          streakType
        };

      } catch (error) {
        console.error('Error calculating user streak:', error);
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: new Date().toISOString(),
          streakType: 'activity'
        };
      }
    },
    enabled: !!profileId,
    staleTime: 300000, // 5 minutes
  });
};