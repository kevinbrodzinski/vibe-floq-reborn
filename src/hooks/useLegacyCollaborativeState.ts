// Legacy wrapper for backward compatibility
// This provides the old API while using the new optimized hooks under the hood

import { useCollaborativeState } from './useCollaborativeState'
import { useAddStop, useRemoveStop, useVoteOnStop } from './usePlanActions'

export function useLegacyCollaborativeState(planId: string) {
  const { stops, isLoading, isReordering, reorder } = useCollaborativeState({ 
    planId, 
    enabled: !!planId 
  })
  
  const addStopMutation = useAddStop()
  const removeStopMutation = useRemoveStop()
  const voteOnStopMutation = useVoteOnStop()

  // Legacy API methods
  const addStop = async (stopData: any) => {
    return addStopMutation.mutateAsync({
      planId,
      title: stopData.title,
      description: stopData.description,
      venueId: stopData.venueId,
      timeSlot: stopData.timeSlot
    })
  }

  const removeStop = async (stopId: string) => {
    return removeStopMutation.mutateAsync({ planId, stopId })
  }

  const reorderStops = async (fromIndex: number, toIndex: number) => {
    if (stops.length === 0) return
    
    const newOrder = [...stops]
    const [removed] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, removed)
    
    return reorder(newOrder.map(stop => stop.id))
  }

  const voteOnStop = async (stopId: string, voteType: 'up' | 'down' | 'maybe', emojiReaction?: string) => {
    return voteOnStopMutation.mutateAsync({
      planId,
      stopId,
      voteType,
      emojiReaction
    })
  }

  return {
    stops,
    isLoading,
    isReordering,
    addStop,
    removeStop,
    reorderStops,
    voteOnStop,
    reorder
  }
}