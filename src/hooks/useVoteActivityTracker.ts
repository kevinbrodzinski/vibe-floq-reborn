import { useState, useEffect, useCallback } from 'react'

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

  const addVoteActivity = useCallback((activity: VoteActivity) => {
    setVoteOverlays(prev => ({
      ...prev,
      [activity.stopId]: activity
    }))

    // Auto-remove after 2 seconds
    setTimeout(() => {
      setVoteOverlays(prev => {
        const { [activity.stopId]: removed, ...rest } = prev
        return rest
      })
    }, 2000)
  }, [])

  const clearVoteOverlay = useCallback((stopId: string) => {
    setVoteOverlays(prev => {
      const { [stopId]: removed, ...rest } = prev
      return rest
    })
  }, [])

  return {
    voteOverlays,
    addVoteActivity,
    clearVoteOverlay
  }
}