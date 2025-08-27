import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { addMinutes, format, parseISO } from 'date-fns'

interface BatchOperation {
  type: 'move' | 'delete' | 'duplicate' | 'update_time' | 'update_venue'
  stopIds: string[]
  data?: any
}

interface BatchTimeUpdate {
  stopId: string
  newStartTime: string
  maintainGaps?: boolean
}

export function useBatchStopOperations(planId: string) {
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Selection management
  const toggleStopSelection = useCallback((stopId: string) => {
    setSelectedStopIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stopId)) {
        newSet.delete(stopId)
      } else {
        newSet.add(stopId)
      }
      return newSet
    })
  }, [])

  const selectAllStops = useCallback((stopIds: string[]) => {
    setSelectedStopIds(new Set(stopIds))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStopIds(new Set())
  }, [])

  const toggleBatchMode = useCallback(() => {
    setBatchMode(prev => {
      if (prev) {
        clearSelection()
      }
      return !prev
    })
  }, [clearSelection])

  // Batch delete operation
  const batchDelete = useMutation({
    mutationFn: async (stopIds: string[]) => {
      const { error } = await supabase
        .from('plan_stops')
        .delete()
        .in('id', stopIds as any)

      if (error) {
        throw new Error(`Failed to delete stops: ${error.message}`)
      }

      // Log activities
      try {
        const activities = stopIds.map(stopId => ({
          plan_id: planId,
          activity_type: 'stop_deleted',
          activity_data: {
            stop_id: stopId,
            source: 'batch_operation'
          }
        }))
        
        await supabase.from('plan_activities').insert(activities as any[])
      } catch (activityError) {
        console.warn('Failed to log batch delete activities:', activityError)
      }

      return stopIds
    },
    onSuccess: (deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', planId] })
      clearSelection()
      
      toast({
        title: 'Stops Deleted',
        description: `${deletedIds.length} stops removed from your plan`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Batch Delete Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // Batch duplicate operation
  const batchDuplicate = useMutation({
    mutationFn: async (stopIds: string[]) => {
      // Get the stops to duplicate
      const { data: stopsToClone, error: fetchError } = await supabase
        .from('plan_stops')
        .select('*')
        .in('id', stopIds as any)

      if (fetchError || !stopsToClone) {
        throw new Error(`Failed to fetch stops: ${fetchError?.message}`)
      }

      // Create duplicates with adjusted times
      const duplicates = stopsToClone.map((stop: any, index) => {
        // Add 30 minutes to start time for each duplicate
        const originalStart = parseISO(`2000-01-01T${stop.start_time}`)
        const newStart = addMinutes(originalStart, 30 * (index + 1))
        const newStartTime = format(newStart, 'HH:mm')
        
        const originalEnd = parseISO(`2000-01-01T${stop.end_time}`)
        const newEnd = addMinutes(originalEnd, 30 * (index + 1))
        const newEndTime = format(newEnd, 'HH:mm')

        return {
          plan_id: planId,
          title: `${stop.title} (Copy)`,
          description: stop.description,
          start_time: newStartTime,
          end_time: newEndTime,
          duration_minutes: stop.duration_minutes,
          estimated_cost_per_person: stop.estimated_cost_per_person,
          venue_id: stop.venue_id,
          venue_data: stop.venue_data
        }
      })

      const { data: newStops, error } = await supabase
        .from('plan_stops')
        .insert(duplicates as any[])
        .select()

      if (error) {
        throw new Error(`Failed to duplicate stops: ${error.message}`)
      }

      return newStops
    },
    onSuccess: (newStops) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', planId] })
      clearSelection()
      
      toast({
        title: 'Stops Duplicated',
        description: `${newStops?.length || 0} stops duplicated with adjusted times`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Batch Duplicate Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // Batch time update operation
  const batchTimeUpdate = useMutation({
    mutationFn: async (updates: BatchTimeUpdate[]) => {
      const results = []
      
      for (const update of updates) {
        const { stopId, newStartTime, maintainGaps = true } = update
        
        // Get current stop data
        const { data: currentStop, error: fetchError } = await supabase
          .from('plan_stops')
          .select('start_time, end_time, duration_minutes')
          .eq('id', stopId as any)
          .single()

        if (fetchError || !currentStop) {
          throw new Error(`Failed to fetch stop ${stopId}: ${fetchError?.message}`)
        }

        // Calculate new end time
        let newEndTime = newStartTime
        if ((currentStop as any).duration_minutes) {
          const startDateTime = parseISO(`2000-01-01T${newStartTime}`)
          const endDateTime = addMinutes(startDateTime, (currentStop as any).duration_minutes)
          newEndTime = format(endDateTime, 'HH:mm')
        }

        const { data, error } = await supabase
          .from('plan_stops')
          .update({
            start_time: newStartTime,
            end_time: newEndTime,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', stopId as any)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update stop ${stopId}: ${error.message}`)
        }
        
        results.push(data)
      }

      return results
    },
    onSuccess: (updatedStops) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', planId] })
      clearSelection()
      
      toast({
        title: 'Times Updated',
        description: `${updatedStops.length} stops rescheduled`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Batch Time Update Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // Smart batch reorder (maintain relative spacing)
  const smartBatchReorder = useMutation({
    mutationFn: async ({ 
      stopIds, 
      newStartTime, 
      maintainSpacing = true 
    }: { 
      stopIds: string[]
      newStartTime: string
      maintainSpacing?: boolean 
    }) => {
      // Get the selected stops with their current times
      const { data: stops, error: fetchError } = await supabase
        .from('plan_stops')
        .select('id, start_time, end_time, duration_minutes')
        .in('id', stopIds as any)
        .order('start_time')

      if (fetchError || !stops) {
        throw new Error(`Failed to fetch stops: ${fetchError?.message}`)
      }

      // Calculate time differences if maintaining spacing
      const updates: BatchTimeUpdate[] = []
      let currentTime = newStartTime

      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i] as any
        updates.push({
          stopId: stop.id,
          newStartTime: currentTime
        })

        if (maintainSpacing && i < stops.length - 1) {
          // Calculate gap to next stop
          const currentStart = parseISO(`2000-01-01T${stop.start_time}`)
          const nextStart = parseISO(`2000-01-01T${(stops[i + 1] as any).start_time}`)
          const gapMinutes = (nextStart.getTime() - currentStart.getTime()) / (1000 * 60)
          
          // Add stop duration plus gap for next start time
          const nextStartTime = addMinutes(
            parseISO(`2000-01-01T${currentTime}`), 
            (stop.duration_minutes || 60) + Math.max(gapMinutes, 15) // Minimum 15-minute gap
          )
          currentTime = format(nextStartTime, 'HH:mm')
        } else if (!maintainSpacing && i < stops.length - 1) {
          // Just add standard duration plus 15 minutes
          const nextStartTime = addMinutes(
            parseISO(`2000-01-01T${currentTime}`), 
            (stop.duration_minutes || 60) + 15
          )
          currentTime = format(nextStartTime, 'HH:mm')
        }
      }

      return batchTimeUpdate.mutateAsync(updates)
    },
    onSuccess: () => {
      toast({
        title: 'Stops Reordered',
        description: 'Selected stops moved with spacing preserved',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Batch Reorder Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // Computed values
  const selectedCount = selectedStopIds.size
  const hasSelection = selectedCount > 0
  const isMultiSelect = selectedCount > 1

  // Batch operation helpers
  const executeOperation = useCallback(async (operation: BatchOperation) => {
    const { type, stopIds, data } = operation

    switch (type) {
      case 'delete':
        return batchDelete.mutateAsync(stopIds)
      case 'duplicate':
        return batchDuplicate.mutateAsync(stopIds)
      case 'update_time':
        return batchTimeUpdate.mutateAsync(data)
      case 'move':
        return smartBatchReorder.mutateAsync({ stopIds, ...data })
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }, [batchDelete, batchDuplicate, batchTimeUpdate, smartBatchReorder])

  return {
    // Selection state
    selectedStopIds: Array.from(selectedStopIds),
    selectedCount,
    hasSelection,
    isMultiSelect,
    batchMode,

    // Selection actions
    toggleStopSelection,
    selectAllStops,
    clearSelection,
    toggleBatchMode,

    // Batch operations
    batchDelete: batchDelete.mutateAsync,
    batchDuplicate: batchDuplicate.mutateAsync,
    batchTimeUpdate: batchTimeUpdate.mutateAsync,
    smartBatchReorder: smartBatchReorder.mutateAsync,
    executeOperation,

    // Loading states
    isDeleting: batchDelete.isPending,
    isDuplicating: batchDuplicate.isPending,
    isUpdatingTimes: batchTimeUpdate.isPending,
    isReordering: smartBatchReorder.isPending,
    isBusy: batchDelete.isPending || batchDuplicate.isPending || 
            batchTimeUpdate.isPending || smartBatchReorder.isPending
  }
}

// Hook for drag and drop with batch selection
export function useBatchDragAndDrop(planId: string, stops: any[]) {
  const batchOps = useBatchStopOperations(planId)
  
  const handleBatchDragEnd = useCallback(async (
    draggedStopIds: string[], 
    targetTimeSlot: string
  ) => {
    if (draggedStopIds.length === 1) {
      // Single stop - use regular drag logic
      return
    }

    // Multiple stops - use smart batch reorder
    try {
      await batchOps.smartBatchReorder({
        stopIds: draggedStopIds,
        newStartTime: targetTimeSlot,
        maintainSpacing: true
      })
    } catch (error) {
      console.error('Batch drag failed:', error)
    }
  }, [batchOps])

  const getSelectedStopsForDrag = useCallback(() => {
    if (!batchOps.hasSelection) return []
    
    return stops
      .filter(stop => batchOps.selectedStopIds.includes(stop.id))
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
  }, [stops, batchOps.selectedStopIds, batchOps.hasSelection])

  return {
    ...batchOps,
    handleBatchDragEnd,
    getSelectedStopsForDrag
  }
}