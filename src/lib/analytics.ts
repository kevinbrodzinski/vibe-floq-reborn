import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// CORE ANALYTICS UTILITY - Phase 3+ Foundation
// ============================================================================

// Event tracking for existing usage
export const track = (event: string, properties?: Record<string, any>) => {
  console.log('Analytics:', event, properties);
  // TODO: Connect to analytics service when ready
};

export const trackEvent = track;
export const trackFloqCreated = (properties?: Record<string, any>) => track('floq_created', properties);
export const trackFloqJoin = (properties?: Record<string, any>) => track('floq_joined', properties);
export const trackFloqSuggestionDismissed = (properties?: Record<string, any>) => track('floq_suggestion_dismissed', properties);
export const trackLocationPermission = (properties?: Record<string, any>) => track('location_permission', properties);

// Haptic feedback
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 50, heavy: 100 };
    navigator.vibrate(patterns[type]);
  }
};

// ============================================================================
// TIME-BASED ANALYTICS (Safe fallbacks until types are updated)
// ============================================================================

export const getTimeInVenueFallback = async (
  userId: string, 
  fromDate: string, 
  toDate: string
) => {
  // Fallback to venue_visits until materialized view is in types
  const { data, error } = await supabase
    .from('venue_visits')
    .select('arrived_at, venue_id')
    .eq('user_id', userId)
    .gte('arrived_at', fromDate)
    .lte('arrived_at', toDate)
    .order('arrived_at');
  
  if (error) throw error;
  
  // Group by day and estimate time (30 min per visit)
  const dailyData = data?.reduce((acc: Record<string, number>, visit) => {
    const day = new Date(visit.arrived_at).toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + 30; // 30 min estimate per visit
    return acc;
  }, {}) || {};
  
  return Object.entries(dailyData).map(([day, minutes_spent]) => ({
    day,
    minutes_spent
  }));
};

export const getTotalTimeOut = async (
  userId: string, 
  fromDate: string, 
  toDate: string
) => {
  const timeData = await getTimeInVenueFallback(userId, fromDate, toDate);
  const totalMinutes = timeData.reduce((sum, day) => sum + (day.minutes_spent || 0), 0);
  return { totalMinutes, days: timeData.length };
};

// ============================================================================
// VENUE DISCOVERY & TRENDING
// ============================================================================

export const getTrendingVenues = async (
  lat?: number, 
  lng?: number, 
  radiusKm: number = 10,
  limit: number = 25
) => {
  // Safe query without popularity column until types are updated
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, lat, lng')
    .limit(limit);
  
  if (error) throw error;
  
  // Add mock popularity for now
  return data?.map(venue => ({ 
    ...venue, 
    popularity: Math.floor(Math.random() * 50), // Mock data
    category: 'restaurant' // Mock category
  })) || [];
};

// ============================================================================
// PERSONAL INSIGHTS
// ============================================================================

export const getMostVisitedVenues = async (
  userId: string,
  days: number = 30,
  limit: number = 5
) => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('venue_visits')
    .select('venue_id, arrived_at')
    .eq('user_id', userId)
    .gte('arrived_at', fromDate.toISOString())
    .order('arrived_at', { ascending: false });
  
  if (error) throw error;
  
  // Count visits per venue
  const venueCount = data?.reduce((acc: Record<string, number>, visit) => {
    acc[visit.venue_id] = (acc[visit.venue_id] || 0) + 1;
    return acc;
  }, {}) || {};
  
  // Sort by count and return top venues
  return Object.entries(venueCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([venue_id, count]) => ({ venue_id, visit_count: count }));
};

export const getWeeklyStreak = async (userId: string) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const timeData = await getTimeInVenueFallback(
    userId,
    oneWeekAgo.toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
  
  // Calculate streak (consecutive days with ≥60 min)
  let currentStreak = 0;
  let maxStreak = 0;
  
  timeData.forEach(day => {
    if ((day.minutes_spent || 0) >= 60) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  return { currentStreak, maxStreak, weeklyMinutes: timeData };
};

// ============================================================================
// SOCIAL ANALYTICS
// ============================================================================

export const getFriendsAtTrendingVenues = async (
  userFriendIds: string[],
  trendingVenueIds: string[]
) => {
  if (!userFriendIds.length || !trendingVenueIds.length) return [];
  
  const { data, error } = await supabase
    .from('venue_visits')
    .select('user_id, venue_id, arrived_at')
    .in('user_id', userFriendIds)
    .in('venue_id', trendingVenueIds)
    .gte('arrived_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Last 4 hours
    .order('arrived_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// ============================================================================
// GAMIFICATION HELPERS
// ============================================================================

export const getUserBadgeProgress = async (userId: string) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { totalMinutes } = await getTotalTimeOut(
    userId,
    thirtyDaysAgo.toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
  
  // Badge tiers
  const badges = [
    { name: 'Bronze Explorer', threshold: 300, icon: '🥉' },
    { name: 'Silver Wanderer', threshold: 600, icon: '🥈' },
    { name: 'Gold Adventurer', threshold: 1200, icon: '🥇' },
    { name: 'Platinum Nomad', threshold: 2400, icon: '💎' }
  ];
  
  const currentBadge = badges.reverse().find(badge => totalMinutes >= badge.threshold);
  const nextBadge = badges.find(badge => totalMinutes < badge.threshold);
  
  return {
    totalMinutes,
    currentBadge,
    nextBadge,
    progress: nextBadge ? (totalMinutes / nextBadge.threshold) * 100 : 100
  };
};

// ============================================================================
// QUICK STATS FOR NOTIFICATIONS
// ============================================================================

export const getDailyActivitySummary = async (userId: string, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('venue_visits')
    .select('venue_id, arrived_at')
    .eq('user_id', userId)
    .gte('arrived_at', targetDate)
    .lt('arrived_at', new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000).toISOString());
  
  if (error) return { minutesOut: 0, venuesVisited: 0 };
  
  const minutesOut = (data?.length || 0) * 30; // 30 min estimate per visit
  const venuesVisited = new Set(data?.map(v => v.venue_id)).size;
  
  return { minutesOut, venuesVisited };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const formatMinutesToHours = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const getDateRange = (days: number): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0]
  };
};

export const calculateDistanceKm = (
  lat1: number, lng1: number, 
  lat2: number, lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Error handling wrapper
export const analyticsQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<T | null> => {
  try {
    const { data, error } = await queryFn();
    if (error) {
      console.error('Analytics query error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Analytics error:', err);
    return null;
  }
};

// ============================================================================
// FUTURE ENHANCEMENTS
// ============================================================================

/*
TODO: When materialized view types are available, replace fallback functions with:
- Direct v_time_in_venue_daily queries
- Proper popularity column access
- RPC functions for complex analytics

Next-layer features ready to build:
1. Trending carousels with 🔥 badges
2. Weekly time-out streaks and achievements  
3. Friends at trending venues notifications
4. Smart status suggestions based on venue categories
5. Venue mayor system and leaderboards
6. Personal insights and year-end recaps
7. ML-powered venue recommendations
*/