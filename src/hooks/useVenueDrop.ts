import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { addMinutes, format, parseISO } from 'date-fns'

interface Venue {
  id: string
  name: string
  address?: string
  categories?: string[]
  rating?: number
  price_tier?: string
  photo_url?: string
  distance_meters?: number
  match_score?: number
  lat?: number
  lng?: number
}

interface VenueDropData {
  venue: Venue
  planId: string
  timeSlot: string
  planDate?: string
  defaultDuration?: number
}

export function useVenueDrop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      venue, 
      planId, 
      timeSlot, 
      planDate,
      defaultDuration = 90 
    }: VenueDropData) => {
      // Calculate end time based on default duration
      const startDateTime = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${timeSlot}`)
      const endDateTime = addMinutes(startDateTime, defaultDuration)
      const endTime = format(endDateTime, 'HH:mm')

      // Generate a title based on venue name and categories
      const primaryCategory = venue.categories?.[0] || 'Visit'
      const title = `${primaryCategory} at ${venue.name}`

      // Generate description with venue details
      const description = [
        venue.address && `📍 ${venue.address}`,
        venue.rating && `⭐ ${venue.rating.toFixed(1)} rating`,
        venue.price_tier && `💰 ${venue.price_tier}`,
        venue.distance_meters && `🚶 ${venue.distance_meters < 1000 
          ? `${Math.round(venue.distance_meters)}m away` 
          : `${(venue.distance_meters / 1000).toFixed(1)}km away`}`
      ].filter(Boolean).join(' • ')

      // Estimate cost based on price tier and categories
      let estimatedCost = 25 // Default
      if (venue.price_tier) {
        switch (venue.price_tier) {
          case '$': estimatedCost = 15; break
          case '$$': estimatedCost = 30; break
          case '$$$': estimatedCost = 50; break
          case '$$$$': estimatedCost = 80; break
        }
      }

      // Adjust duration based on venue type
      let adjustedDuration = defaultDuration
      if (venue.categories?.some(cat => 
        ['restaurant', 'cafe', 'bar', 'food'].some(food => 
          cat.toLowerCase().includes(food)
        )
      )) {
        adjustedDuration = 60 // Shorter for food venues
      } else if (venue.categories?.some(cat => 
        ['museum', 'attraction', 'park', 'entertainment'].some(activity => 
          cat.toLowerCase().includes(activity)
        )
      )) {
        adjustedDuration = 120 // Longer for activities
      }

      // Recalculate end time with adjusted duration
      const adjustedEndDateTime = addMinutes(startDateTime, adjustedDuration)
      const adjustedEndTime = format(adjustedEndDateTime, 'HH:mm')

      // Create the plan stop
      const { data: stop, error } = await supabase
        .from('plan_stops')
        .insert({
          plan_id: planId,
          title,
          description,
          start_time: timeSlot,
          end_time: adjustedEndTime,
          duration_minutes: adjustedDuration,
          estimated_cost_per_person: estimatedCost,
          venue_id: venue.id,
          venue_data: {
            name: venue.name,
            address: venue.address,
            categories: venue.categories,
            rating: venue.rating,
            price_tier: venue.price_tier,
            photo_url: venue.photo_url,
            lat: venue.lat,
            lng: venue.lng,
            match_score: venue.match_score
          }
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create stop: ${error.message}`)
      }

      // Log the activity
      try {
        await supabase.from('plan_activities').insert({
          plan_id: planId,
          activity_type: 'venue_added',
          activity_data: {
            stop_id: stop.id,
            venue_id: venue.id,
            venue_name: venue.name,
            time_slot: timeSlot,
            source: 'drag_drop'
          }
        })
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError)
      }

      return stop
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.planId] })

      toast({
        title: 'Venue Added! 🎉',
        description: `${variables.venue.name} added to your plan at ${variables.timeSlot}`,
      })
    },
    onError: (error: Error, variables) => {
      toast({
        title: 'Failed to Add Venue',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Hook for batch venue drops (multiple venues at once)
export function useBatchVenueDrop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (drops: VenueDropData[]) => {
      const results = []
      
      for (const drop of drops) {
        const { venue, planId, timeSlot, planDate, defaultDuration = 90 } = drop
        
        const startDateTime = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${timeSlot}`)
        const endDateTime = addMinutes(startDateTime, defaultDuration)
        const endTime = format(endDateTime, 'HH:mm')

        const primaryCategory = venue.categories?.[0] || 'Visit'
        const title = `${primaryCategory} at ${venue.name}`

        const { data: stop, error } = await supabase
          .from('plan_stops')
          .insert({
            plan_id: planId,
            title,
            description: venue.address ? `📍 ${venue.address}` : '',
            start_time: timeSlot,
            end_time: endTime,
            duration_minutes: defaultDuration,
            estimated_cost_per_person: 25,
            venue_id: venue.id,
            venue_data: {
              name: venue.name,
              address: venue.address,
              categories: venue.categories,
              rating: venue.rating,
              price_tier: venue.price_tier,
              photo_url: venue.photo_url,
              lat: venue.lat,
              lng: venue.lng,
              match_score: venue.match_score
            }
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create stop for ${venue.name}: ${error.message}`)
        }
        
        results.push(stop)
      }

      return results
    },
    onSuccess: (data, variables) => {
      if (variables.length > 0) {
        const planId = variables[0].planId
        queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
        queryClient.invalidateQueries({ queryKey: ['plan-details', planId] })
      }

      toast({
        title: 'Venues Added! 🎉',
        description: `${variables.length} venues added to your plan`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Batch Add Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Hook for smart venue suggestions based on plan context
export function useSmartVenueSuggestions(planId: string) {
  return useMutation({
    mutationFn: async ({ 
      timeSlot, 
      planDate,
      radius = 2000,
      limit = 10
    }: { 
      timeSlot: string
      planDate?: string
      radius?: number
      limit?: number
    }) => {
      // Get plan details for context
      const { data: plan, error: planError } = await supabase
        .from('floq_plans')
        .select('lat, lng, preferences, participant_count')
        .eq('id', planId)
        .single()

      if (planError || !plan.lat || !plan.lng) {
        throw new Error('Failed to get plan location')
      }

      // Get existing stops for context
      const { data: existingStops } = await supabase
        .from('plan_stops')
        .select('venue_id, venue_data')
        .eq('plan_id', planId)

      const existingVenueIds = existingStops?.map(s => s.venue_id).filter(Boolean) || []

      // Call the intelligent venue function
      const { data: venues, error } = await supabase.rpc('get_venues_with_intelligence', {
        center_lat: plan.lat,
        center_lng: plan.lng,
        radius_meters: radius,
        limit_count: limit,
        date_context: planDate || new Date().toISOString().split('T')[0],
        time_window: {
          start_time: timeSlot,
          duration_minutes: 90
        }
      })

      if (error) {
        throw new Error(`Failed to get venue suggestions: ${error.message}`)
      }

      // Filter out already added venues and add match scores
      const filteredVenues = venues
        ?.filter(venue => !existingVenueIds.includes(venue.id))
        .map(venue => ({
          ...venue,
          match_score: calculateMatchScore(venue, timeSlot, plan.preferences)
        }))
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))

      return filteredVenues || []
    }
  })
}

// Helper function to calculate venue match score
function calculateMatchScore(venue: any, timeSlot: string, preferences?: any): number {
  let score = 50 // Base score

  // Time-based scoring
  const hour = parseInt(timeSlot.split(':')[0])
  
  if (venue.categories?.includes('restaurant') || venue.categories?.includes('cafe')) {
    if (hour >= 7 && hour <= 10) score += 20 // Breakfast
    if (hour >= 12 && hour <= 14) score += 25 // Lunch
    if (hour >= 18 && hour <= 21) score += 30 // Dinner
  }
  
  if (venue.categories?.includes('bar') || venue.categories?.includes('nightlife')) {
    if (hour >= 17) score += 25 // Evening/night
  }
  
  if (venue.categories?.includes('museum') || venue.categories?.includes('attraction')) {
    if (hour >= 10 && hour <= 17) score += 20 // Daytime
  }

  // Rating-based scoring
  if (venue.rating) {
    score += (venue.rating - 3) * 10 // Boost for ratings above 3
  }

  // Popularity scoring
  if (venue.popularity) {
    score += Math.min(venue.popularity / 10, 20) // Max 20 points from popularity
  }

  // Vibe score
  if (venue.vibe_score) {
    score += (venue.vibe_score - 50) / 5 // Convert 0-100 to -10 to +10
  }

  return Math.max(0, Math.min(100, score))
}