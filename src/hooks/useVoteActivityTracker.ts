import { useState, useEffect, useCallback, useRef } from 'react'

export interface VoteActivity {
  id: string
  type: 'vote_cast'
  timestamp: string
  stopId: string
  userId: string
  username: string
  vote: 'up' | 'down'
}

export function useVoteActivityTracker() {
  const [voteOverlays, setVoteOverlays] = useState<Record<string, VoteActivity>>({})
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})

  const addVoteActivity = useCallback((activity: VoteActivity) => {
    // Clear existing timeout for this stop if any
    if (timeoutsRef.current[activity.stopId]) {
      clearTimeout(timeoutsRef.current[activity.stopId])
    }

    setVoteOverlays(prev => ({
      ...prev,
      [activity.stopId]: activity
    }))

    // Auto-remove after 2 seconds with proper cleanup
    timeoutsRef.current[activity.stopId] = setTimeout(() => {
      setVoteOverlays(prev => {
        const { [activity.stopId]: removed, ...rest } = prev
        return rest
      })
      delete timeoutsRef.current[activity.stopId]
    }, 2000)
  }, [])

  const clearVoteOverlay = useCallback((stopId: string) => {
    // Clear timeout if exists
    if (timeoutsRef.current[stopId]) {
      clearTimeout(timeoutsRef.current[stopId])
      delete timeoutsRef.current[stopId]
    }
    
    setVoteOverlays(prev => {
      const { [stopId]: removed, ...rest } = prev
      return rest
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout))
      timeoutsRef.current = {}
    }
  }, [])

  return {
    voteOverlays,
    addVoteActivity,
    clearVoteOverlay
  }
}