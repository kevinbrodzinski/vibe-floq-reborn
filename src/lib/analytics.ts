
import { supabase } from '@/integrations/supabase/client';

/* ─────────────────────────────────────────────────────────────────
   Core Analytics Utilities
   Supporting discovery, insights, social features & gamification
──────────────────────────────────────────────────────────────── */

// Time-based analytics
export const getTimeInVenue = async (uid?: string, from?: string, to?: string) => {
  const query = supabase
    .from('v_time_in_venue_daily')
    .select('day, minutes_spent, venue_id');
  
  if (uid) query.eq('user_id', uid);
  if (from) query.gte('day', from);
  if (to) query.lte('day', to);
  
  return query.order('day');
};

export const getUserWeeklyStreak = async (uid: string) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return getTimeInVenue(uid, sevenDaysAgo);
};

export const getUserDailyTotal = async (uid: string, day?: string) => {
  const targetDay = day || new Date().toISOString().split('T')[0];
  return supabase
    .from('v_time_in_venue_daily')
    .select('minutes_spent')
    .eq('user_id', uid)
    .eq('day', targetDay);
};

// Venue discovery & trending
export const getTrendingVenues = async (lat?: number, lng?: number, radiusKm?: number) => {
  // Base query for popular venues
  let query = supabase
    .from('venues')
    .select('id, name, address, lat, lng, popularity, venue_type')
    .order('popularity', { ascending: false })
    .limit(25);
  
  // Note: Geographic filtering would be done client-side for now
  // In production, this could use PostGIS functions for radius queries
  
  return query;
};

export const getVenuesByPopularity = async (limit = 10) => {
  return supabase
    .from('venues')
    .select('*')
    .order('popularity', { ascending: false })
    .limit(limit);
};

export const getLocalsAlsoVisit = async (venueId: string, days = 30) => {
  // Find venues frequented by users who also visit the target venue
  return supabase.rpc('get_related_venues_by_user_overlap', {
    target_venue_id: venueId,
    days_back: days
  });
};

// Social features
export const getFriendsAtPopularVenues = async (userId: string, venueIds: string[]) => {
  if (venueIds.length === 0) return { data: [], error: null };
  
  return supabase
    .from('venue_stays')
    .select(`
      user_id,
      venue_id,
      venues(name, address),
      profiles(display_name, avatar_path)
    `)
    .in('venue_id', venueIds)
    .neq('user_id', userId)
    .is('left_at', null); // Currently at venue
};

export const getTimeLeaderboard = async (userIds: string[], days = 7) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return supabase
    .from('v_time_in_venue_daily')
    .select(`
      user_id,
      profiles(display_name, avatar_path),
      minutes_spent
    `)
    .in('user_id', userIds)
    .gte('day', startDate);
};

// Gamification & achievements
export const getUserTotalMinutes = async (userId: string, days = 30) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return supabase
    .from('v_time_in_venue_daily')
    .select('minutes_spent')
    .eq('user_id', userId)
    .gte('day', startDate);
};

export const getVenueMayor = async (venueId: string, days = 30) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return supabase
    .from('v_time_in_venue_daily')
    .select(`
      user_id,
      profiles(display_name, avatar_path),
      minutes_spent
    `)
    .eq('venue_id', venueId)
    .gte('day', startDate)
    .order('minutes_spent', { ascending: false })
    .limit(1);
};

// Smart recommendations
export const getPersonalizedVenues = async (userId: string, lat?: number, lng?: number) => {
  // Combine user history with trending venues
  const userHistory = await supabase
    .from('venue_stays')
    .select('venue_id, venues(venue_type)')
    .eq('user_id', userId)
    .limit(20);
  
  // Get venues of similar types that are trending
  return getTrendingVenues(lat, lng);
};

export const getVenueInsights = async (venueId: string) => {
  const [avgStay, peakHours, recentVisitors] = await Promise.all([
    // Average stay duration
    supabase
      .from('venue_stays')
      .select('minutes_spent')
      .eq('venue_id', venueId)
      .not('minutes_spent', 'is', null),
    
    // Peak hours (would need more complex query in production)
    supabase
      .from('venue_stays')
      .select('arrived_at')
      .eq('venue_id', venueId)
      .limit(100),
    
    // Recent visitor count
    supabase
      .from('venue_stays')
      .select('user_id', { count: 'exact' })
      .eq('venue_id', venueId)
      .gte('arrived_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);
  
  return {
    avgStay: avgStay.data || [],
    peakHours: peakHours.data || [],
    recentVisitors: recentVisitors.count || 0
  };
};

// Utility functions for UI
export const formatMinutesToHours = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

export const calculateStreakDays = (dailyData: Array<{ day: string; minutes_spent: number }>, minMinutes = 60): number => {
  if (!dailyData?.length) return 0;
  
  let streak = 0;
  const sortedDays = [...dailyData].sort((a, b) => b.day.localeCompare(a.day));
  
  for (const day of sortedDays) {
    if (day.minutes_spent >= minMinutes) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// Badge/achievement helpers
export const getBadgeForMinutes = (totalMinutes: number) => {
  if (totalMinutes >= 1800) return { level: 'gold', name: 'Explorer Legend', icon: '🏆' };
  if (totalMinutes >= 900) return { level: 'silver', name: 'Social Butterfly', icon: '🦋' };
  if (totalMinutes >= 300) return { level: 'bronze', name: 'Getting Out There', icon: '🌟' };
  return null;
};

export const getStreakBadge = (streakDays: number) => {
  if (streakDays >= 7) return { name: 'Weekly Warrior', icon: '🔥' };
  if (streakDays >= 3) return { name: 'On a Roll', icon: '⚡' };
  return null;
};

// Health monitoring (for ops)
export const getAnalyticsHealth = async () => {
  const [venueCount, stayCount, dailyCount] = await Promise.all([
    supabase.from('venues').select('id', { count: 'exact' }),
    supabase.from('venue_stays').select('id', { count: 'exact' }),
    supabase.from('v_time_in_venue_daily').select('day', { count: 'exact' })
  ]);
  
  return {
    venues: venueCount.count || 0,
    stays: stayCount.count || 0,
    dailyRecords: dailyCount.count || 0,
    timestamp: new Date().toISOString()
  };
};
