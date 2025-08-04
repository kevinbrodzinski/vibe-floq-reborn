/**
 * Enhanced Daily Recap Analytics
 * Integrates auto check-in monitoring, proximity events, and venue detection data
 */

import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import dayjs from '@/lib/dayjs'
import type { RecapData } from './index'

export interface EnhancedRecapData extends RecapData {
  // Auto check-in metrics
  autoCheckins: {
    total: number
    successful: number
    failureRate: number
    averageConfidence: number
    detectionMethods: {
      enhanced: number
      gps_fallback: number
    }
  }
  
  // Proximity & social metrics
  proximityEvents: {
    totalEvents: number
    uniqueFriends: number
    averageProximityDuration: number
    closestEncounter: {
      distance: number
      friendName?: string
      venue?: string
    }
  }
  
  // Enhanced venue insights
  venueInsights: {
    newVenues: number
    returnVisits: number
    favoriteVenueStreak: number
    venueTypes: Array<{
      category: string
      count: number
      totalMinutes: number
    }>
  }
  
  // Privacy & geofencing
  privacyMetrics: {
    geofenceActivations: number
    privacyFiltered: number
    hiddenLocationMinutes: number
  }
  
  // Personal records
  personalRecords: {
    longestDayThisMonth: boolean
    mostVenuesThisMonth: boolean
    mostSocialThisMonth: boolean
  }
}

export const QK_Enhanced = {
  EnhancedRecap: (profileId: string, date: string) => ['enhanced-recap', profileId, date] as const,
}

/**
 * Fetch enhanced auto check-in metrics for a specific day
 */
async function getAutoCheckinMetrics(profileId: string, date: string) {
  // Get auto check-in attempts from venue_stays (successful ones)
  const { data: venueStays } = await supabase
    .from('venue_stays')
    .select(`
      id,
      venue_id,
      arrived_at,
      departed_at,
      venues (
        name,
        categories
      )
    `)
    .eq('profile_id', profileId)
    .gte('arrived_at', `${date}T00:00:00Z`)
    .lte('arrived_at', `${date}T23:59:59Z`)

  // TODO: Add auto check-in attempt logging table to track failures
  // For now, we'll estimate based on venue_stays
  const total = venueStays?.length || 0
  const successful = total // All venue_stays are successful by definition
  
  return {
    total,
    successful,
    failureRate: 0, // TODO: Calculate from attempt logs
    averageConfidence: 0.8, // TODO: Get from actual confidence scores
    detectionMethods: {
      enhanced: Math.floor(total * 0.7), // Estimate 70% enhanced
      gps_fallback: Math.floor(total * 0.3) // Estimate 30% GPS fallback
    }
  }
}

/**
 * Fetch proximity event metrics for a specific day
 */
async function getProximityMetrics(profileId: string, date: string) {
  const { data: proximityEvents } = await supabase
    .from('proximity_events')
    .select(`
      id,
      profile_id_b,
      event_type,
      distance_meters,
      confidence,
      event_ts,
      venue_id
    `)
    .eq('profile_id_a', profileId)
    .gte('event_ts', `${date}T00:00:00Z`)
    .lte('event_ts', `${date}T23:59:59Z`)

  const totalEvents = proximityEvents?.length || 0
  const uniqueFriends = new Set(proximityEvents?.map(e => e.profile_id_b)).size
  
  // Calculate average proximity duration (rough estimate)
  const sustainEvents = proximityEvents?.filter(e => e.event_type === 'sustain') || []
  const averageProximityDuration = sustainEvents.length > 0 
    ? sustainEvents.reduce((sum, e) => sum + 30, 0) / sustainEvents.length // Estimate 30s per sustain event
    : 0

  // Find closest encounter
  const closestEvent = proximityEvents?.reduce((closest, event) => {
    return !closest || event.distance_meters < closest.distance_meters ? event : closest
  }, null as typeof proximityEvents[0] | null)

  return {
    totalEvents,
    uniqueFriends,
    averageProximityDuration,
    closestEncounter: {
      distance: closestEvent?.distance_meters || 0,
      friendName: undefined, // TODO: Join with profiles to get friend name
      venue: closestEvent?.venue_id
    }
  }
}

/**
 * Fetch enhanced venue insights
 */
async function getVenueInsights(profileId: string, date: string) {
  const { data: venueStays } = await supabase
    .from('venue_stays')
    .select(`
      id,
      venue_id,
      arrived_at,
      venues (
        name,
        categories
      )
    `)
    .eq('profile_id', profileId)
    .gte('arrived_at', `${date}T00:00:00Z`)
    .lte('arrived_at', `${date}T23:59:59Z`)

  // Check for new venues (first time visits)
  const { data: userVenueHistory } = await supabase
    .from('venue_stays')
    .select('venue_id')
    .eq('profile_id', profileId)
    .lt('arrived_at', `${date}T00:00:00Z`)

  const previousVenueIds = new Set(userVenueHistory?.map(v => v.venue_id))
  const todayVenueIds = venueStays?.map(v => v.venue_id) || []
  
  const newVenues = todayVenueIds.filter(id => !previousVenueIds.has(id)).length
  const returnVisits = todayVenueIds.length - newVenues

  // Venue category analysis
  const venueTypes = new Map<string, { count: number; totalMinutes: number }>()
  
  venueStays?.forEach(stay => {
    const categories = stay.venues?.categories || ['uncategorized']
    categories.forEach(category => {
      if (!venueTypes.has(category)) {
        venueTypes.set(category, { count: 0, totalMinutes: 0 })
      }
      const stats = venueTypes.get(category)!
      stats.count += 1
      // TODO: Calculate actual minutes from arrived_at/departed_at
      stats.totalMinutes += 30 // Rough estimate
    })
  })

  return {
    newVenues,
    returnVisits,
    favoriteVenueStreak: 0, // TODO: Calculate streak logic
    venueTypes: Array.from(venueTypes.entries()).map(([category, stats]) => ({
      category,
      ...stats
    }))
  }
}

/**
 * Fetch privacy and geofencing metrics
 */
async function getPrivacyMetrics(_profileId: string, _date: string) {
  // TODO: Add geofence activation logging
  // For now, return placeholder data
  return {
    geofenceActivations: 0,
    privacyFiltered: 0,
    hiddenLocationMinutes: 0
  }
}

/**
 * Check for personal records
 */
async function getPersonalRecords(profileId: string, date: string, recapData: RecapData) {
  const currentMonth = dayjs(date).startOf('month').format('YYYY-MM-DD')
  const endOfMonth = dayjs(date).endOf('month').format('YYYY-MM-DD')

  // Get all recaps for current month
  const { data: monthRecaps } = await supabase
    .from('daily_recap_cache')
    .select('payload')
    .eq('user_id', profileId)
    .gte('day', currentMonth)
    .lte('day', endOfMonth)

  const monthData = monthRecaps?.map(r => r.payload as RecapData) || []
  
  const longestDayThisMonth = monthData.every(d => recapData.totalMins >= d.totalMins)
  const mostVenuesThisMonth = monthData.every(d => recapData.venues >= d.venues)
  const mostSocialThisMonth = monthData.every(d => recapData.encounters >= d.encounters)

  return {
    longestDayThisMonth,
    mostVenuesThisMonth,
    mostSocialThisMonth
  }
}

/**
 * Hook to fetch enhanced daily recap data
 */
export const useEnhancedDailyRecap = () => {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  
  return useQuery({
    queryKey: QK_Enhanced.EnhancedRecap('current-user', yesterday),
    queryFn: async (): Promise<EnhancedRecapData | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Get base recap data
      const { data: baseRecap } = await supabase
        .from('daily_recap_cache')
        .select('payload')
        .eq('user_id', user.id)
        .eq('day', yesterday)
        .maybeSingle()

      if (!baseRecap?.payload) return null

      const recapData = baseRecap.payload as RecapData

      // Fetch enhanced metrics in parallel
      const [
        autoCheckins,
        proximityEvents,
        venueInsights,
        privacyMetrics,
        personalRecords
      ] = await Promise.all([
        getAutoCheckinMetrics(user.id, yesterday),
        getProximityMetrics(user.id, yesterday),
        getVenueInsights(user.id, yesterday),
        getPrivacyMetrics(user.id, yesterday),
        getPersonalRecords(user.id, yesterday, recapData)
      ])

      return {
        ...recapData,
        autoCheckins,
        proximityEvents,
        venueInsights,
        privacyMetrics,
        personalRecords
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: true
  })
}

/**
 * Get recap insights for display
 */
export function getRecapInsights(data: EnhancedRecapData): string[] {
  const insights: string[] = []

  // Auto check-in insights
  if (data.autoCheckins.total > 0) {
    const successRate = (data.autoCheckins.successful / data.autoCheckins.total) * 100
    insights.push(`${data.autoCheckins.successful} successful auto check-ins (${successRate.toFixed(0)}% success rate)`)
    
    if (data.autoCheckins.detectionMethods.enhanced > data.autoCheckins.detectionMethods.gps_fallback) {
      insights.push(`Enhanced venue detection worked ${data.autoCheckins.detectionMethods.enhanced} times`)
    }
  }

  // Proximity insights
  if (data.proximityEvents.uniqueFriends > 0) {
    insights.push(`Detected proximity with ${data.proximityEvents.uniqueFriends} friends`)
    
    if (data.proximityEvents.closestEncounter.distance < 10) {
      insights.push(`Had a very close encounter (${data.proximityEvents.closestEncounter.distance}m away)`)
    }
  }

  // Venue insights
  if (data.venueInsights.newVenues > 0) {
    insights.push(`Discovered ${data.venueInsights.newVenues} new places`)
  }

  // Personal records
  if (data.personalRecords.longestDayThisMonth) {
    insights.push(`🎉 Longest day out this month!`)
  }
  if (data.personalRecords.mostVenuesThisMonth) {
    insights.push(`🎉 Most places visited this month!`)
  }
  if (data.personalRecords.mostSocialThisMonth) {
    insights.push(`🎉 Most social day this month!`)
  }

  return insights
}