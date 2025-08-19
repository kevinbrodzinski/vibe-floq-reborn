// src/lib/analytics/insights.ts
// ----------------------------------------------------------------------
// Phase-3 analytical helpers for venue insights, social features, etc.
// ----------------------------------------------------------------------

import { supabase } from '@/integrations/supabase/client';
// Types moved inline since tables now exist in main schema
interface TimeInVenueDaily {
  profile_id: string;
  day: string;
  minutes_spent: number;
  venue_id?: string;
}

interface VenueVisit {
  profile_id: string;
  venue_id: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Core data fetching utilities                                      */
/* ------------------------------------------------------------------ */

type PopularVenue = { id: string; name: string; latitude?: number; longitude?: number; popularity?: number };
type VenueStay = { profile_id: string; venue_id: string; minutes_spent: number; day: string };

/**
 * Fetch time-in-venue data for insights and streaks
 */
export async function fetchTimeSeries(uid: string, fromDate?: string, toDate?: string) {
  let query = supabase
    .from('v_time_in_venue_daily' as any)
    .select('*')
    .eq('profile_id', uid);

  if (fromDate) query = query.gte('day', fromDate);
  if (toDate) query = query.lte('day', toDate);

  const { data, error } = await query.order('day');
  
  if (error) throw error;
  return (data ?? []) as unknown as TimeInVenueDaily[];
}

/**
 * Get trending venues by popularity within radius
 */
export async function getTrendingVenues(lat?: number, lng?: number, radiusKm = 10, limit = 25) {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('popularity', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PopularVenue[];
}

/**
 * Get venue visit patterns for a user
 */
export async function getVenueVisitPatterns(uid: string, days = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('venue_visits' as any)
    .select('venue_id, created_at')
    .eq('profile_id', uid)
    .gte('created_at', fromDate.toISOString())
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Analytics computation helpers                                     */
/* ------------------------------------------------------------------ */

/**
 * Calculate weekly streak from time series data
 */
export function calculateWeeklyStreak(timeData: TimeInVenueDaily[], minMinutesPerDay = 60): number {
  if (!timeData.length) return 0;
  
  // Group by week and sum minutes per day
  const dailyTotals = timeData.reduce((acc, curr) => {
    const day = curr.day;
    acc[day] = (acc[day] || 0) + curr.minutes_spent;
    return acc;
  }, {} as Record<string, number>);

  // Check consecutive days with >= minMinutesPerDay
  const sortedDays = Object.keys(dailyTotals).sort();
  let currentStreak = 0;
  let maxStreak = 0;

  for (const day of sortedDays) {
    if (dailyTotals[day] >= minMinutesPerDay) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Get most visited venue for a user
 */
export function getMostVisitedVenue(venueStays: VenueStay[]): { venueId: string; totalMinutes: number } | null {
  if (!venueStays.length) return null;

  const venueMinutes = venueStays.reduce((acc, stay) => {
    acc[stay.venue_id] = (acc[stay.venue_id] || 0) + stay.minutes_spent;
    return acc;
  }, {} as Record<string, number>);

  const topVenue = Object.entries(venueMinutes)
    .sort(([,a], [,b]) => b - a)[0];

  if (!topVenue) return null;
  
  return {
    venueId: topVenue[0],
    totalMinutes: topVenue[1]
  };
}

/**
 * Smart status inference from venue time
 */
export function inferSmartStatus(timeData: TimeInVenueDaily[], venueTypes: Record<string, string> = {}): string | null {
  const today = new Date().toISOString().split('T')[0];
  const todayData = timeData.filter(d => d.day === today);
  
  const totalOfficeTime = todayData
    .filter(d => d.venue_id && venueTypes[d.venue_id] === 'office')
    .reduce((sum, d) => sum + d.minutes_spent, 0);

  if (totalOfficeTime >= 120) return 'working';
  
  const totalCafeTime = todayData
    .filter(d => d.venue_id && venueTypes[d.venue_id] === 'cafe')
    .reduce((sum, d) => sum + d.minutes_spent, 0);

  if (totalCafeTime >= 90) return 'studying';
  
  return null;
}

/* ------------------------------------------------------------------ */
/*  Social & gamification helpers                                     */
/* ------------------------------------------------------------------ */

/**
 * Calculate leaderboard rankings by minutes spent
 */
export function calculateTimeLeaderboard(userTimeData: Array<{ profileId: string; totalMinutes: number }>) {
  return userTimeData
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .map((user, index) => ({
      ...user,
      rank: index + 1
    }));
}

/**
 * Determine badge tier based on monthly minutes
 */
export function getBadgeTier(monthlyMinutes: number): string {
  if (monthlyMinutes >= 1200) return 'gold'; // 20+ hours
  if (monthlyMinutes >= 600) return 'silver'; // 10+ hours  
  if (monthlyMinutes >= 300) return 'bronze'; // 5+ hours
  return 'none';
}

/**
 * Check if user qualifies as venue "mayor"
 */
export function checkVenueMayor(venueId: string, userMinutes: number, allUserMinutes: Array<{ profileId: string; minutes: number }>): boolean {
  const sortedUsers = allUserMinutes.sort((a, b) => b.minutes - a.minutes);
  return sortedUsers.length > 0 && sortedUsers[0].minutes === userMinutes && userMinutes > 0;
}

/* ------------------------------------------------------------------ */
/*  Recommendation helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Get venue recommendations based on popularity and distance
 */
export function rankVenuesByPopularityAndDistance(
  venues: PopularVenue[],
  userLat: number,
  userLng: number,
  maxDistanceKm = 10
): PopularVenue[] {
  return venues
    .filter(venue => {
      if (!venue.latitude || !venue.longitude) return false;
      const distance = getHaversineDistance(
        userLat, userLng,
        venue.latitude, venue.longitude
      );
      return distance <= maxDistanceKm;
    })
    .sort((a, b) => {
      const popularityA = a.popularity || 0;
      const popularityB = b.popularity || 0;
      return popularityB - popularityA;
    });
}

/**
 * Simple Haversine distance calculation
 */
function getHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}