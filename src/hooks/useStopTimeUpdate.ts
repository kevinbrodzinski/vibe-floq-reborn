import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { addMinutes, parseISO, format } from 'date-fns'

interface UpdateStopTimeData {
  stopId: string
  planId: string
  newStartTime: string
  planDate?: string
  maintainDuration?: boolean
}

export function useStopTimeUpdate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      stopId, 
      planId, 
      newStartTime, 
      planDate, 
      maintainDuration = true 
    }: UpdateStopTimeData) => {
      // First get the current stop data to calculate new end time
      const { data: currentStop, error: fetchError } = await supabase
        .from('plan_stops')
        .select('start_time, end_time, duration_minutes, title')
        .eq('id', stopId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch stop data: ${fetchError.message}`)
      }

      let newEndTime = newStartTime
      
      if (maintainDuration && currentStop.duration_minutes) {
        // Calculate new end time based on duration
        const startDateTime = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${newStartTime}`)
        const endDateTime = addMinutes(startDateTime, currentStop.duration_minutes)
        newEndTime = format(endDateTime, 'HH:mm')
      } else if (currentStop.start_time && currentStop.end_time) {
        // Calculate duration from current times and apply to new start time
        const oldStart = parseISO(`2000-01-01T${currentStop.start_time}`)
        const oldEnd = parseISO(`2000-01-01T${currentStop.end_time}`)
        const duration = (oldEnd.getTime() - oldStart.getTime()) / (1000 * 60) // minutes
        
        const startDateTime = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${newStartTime}`)
        const endDateTime = addMinutes(startDateTime, duration)
        newEndTime = format(endDateTime, 'HH:mm')
      }

      // Update the stop with new times
      const { data, error } = await supabase
        .from('plan_stops')
        .update({
          start_time: newStartTime,
          end_time: newEndTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', stopId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update stop time: ${error.message}`)
      }

      // Log the activity
      try {
        await supabase.from('plan_activities').insert({
          plan_id: planId,
          activity_type: 'stop_time_updated',
          activity_data: {
            stop_id: stopId,
            old_start_time: currentStop.start_time,
            new_start_time: newStartTime,
            old_end_time: currentStop.end_time,
            new_end_time: newEndTime,
            stop_title: currentStop.title
          }
        })
      } catch (activityError) {
        console.warn('Failed to log activity:', activityError)
        // Don't fail the main operation if activity logging fails
      }

      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.planId] })

      toast({
        title: 'Stop Rescheduled',
        description: `Stop moved to ${variables.newStartTime}`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Reschedule',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Hook for batch time updates (useful for resolving conflicts)
export function useBatchStopTimeUpdate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (updates: UpdateStopTimeData[]) => {
      const results = []
      
      for (const update of updates) {
        const { data, error } = await supabase
          .from('plan_stops')
          .update({
            start_time: update.newStartTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.stopId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update stop ${update.stopId}: ${error.message}`)
        }
        
        results.push(data)
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
        title: 'Timeline Updated',
        description: `${variables.length} stops rescheduled`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Batch Update Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Hook for smart time suggestions (avoids conflicts)
export function useSmartTimeSlotSuggestion(planId: string) {
  return useMutation({
    mutationFn: async ({ 
      requestedTime, 
      stopDuration = 60,
      planDate 
    }: { 
      requestedTime: string
      stopDuration?: number
      planDate?: string 
    }) => {
      // Get all existing stops for the plan
      const { data: existingStops, error } = await supabase
        .from('plan_stops')
        .select('id, start_time, end_time, duration_minutes, title')
        .eq('plan_id', planId)
        .order('start_time')

      if (error) {
        throw new Error(`Failed to fetch existing stops: ${error.message}`)
      }

      // Find the best available time slot
      const requestedStart = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${requestedTime}`)
      const requestedEnd = addMinutes(requestedStart, stopDuration)

      // Check for conflicts
      const hasConflict = existingStops?.some(stop => {
        if (!stop.start_time || !stop.end_time) return false
        
        const stopStart = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${stop.start_time}`)
        const stopEnd = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${stop.end_time}`)
        
        // Check if times overlap
        return (requestedStart < stopEnd && requestedEnd > stopStart)
      })

      if (!hasConflict) {
        return {
          suggestedTime: requestedTime,
          isOptimal: true,
          conflicts: [],
          alternatives: []
        }
      }

      // Find alternative times
      const alternatives = []
      const startHour = 8 // Start searching from 8 AM
      const endHour = 23 // End at 11 PM
      
      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minutes = 0; minutes < 60; minutes += 30) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
          const slotStart = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${timeSlot}`)
          const slotEnd = addMinutes(slotStart, stopDuration)
          
          const hasSlotConflict = existingStops?.some(stop => {
            if (!stop.start_time || !stop.end_time) return false
            
            const stopStart = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${stop.start_time}`)
            const stopEnd = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${stop.end_time}`)
            
            return (slotStart < stopEnd && slotEnd > stopStart)
          })
          
          if (!hasSlotConflict) {
            alternatives.push({
              time: timeSlot,
              score: Math.abs(hour * 60 + minutes - (parseInt(requestedTime.split(':')[0]) * 60 + parseInt(requestedTime.split(':')[1])))
            })
          }
          
          if (alternatives.length >= 5) break
        }
        if (alternatives.length >= 5) break
      }

      // Sort alternatives by proximity to requested time
      alternatives.sort((a, b) => a.score - b.score)

      return {
        suggestedTime: alternatives[0]?.time || requestedTime,
        isOptimal: false,
        conflicts: existingStops?.filter(stop => {
          if (!stop.start_time || !stop.end_time) return false
          
          const stopStart = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${stop.start_time}`)
          const stopEnd = parseISO(`${planDate || new Date().toISOString().split('T')[0]}T${stop.end_time}`)
          
          return (requestedStart < stopEnd && requestedEnd > stopStart)
        }) || [],
        alternatives: alternatives.slice(0, 3).map(alt => alt.time)
      }
    }
  })
}