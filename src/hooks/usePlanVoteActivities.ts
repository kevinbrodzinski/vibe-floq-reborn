import { useMemo } from 'react'
import type { VoteActivity } from './useVoteActivityTracker'

interface PlanActivity {
  id: string
  type: string
  timestamp: string
  user: string
  details: string
  voteData?: {
    stopId: string
    userId: string
    username: string
    voteType: 'up' | 'down'
  }
}

export function usePlanVoteActivities(activities: PlanActivity[]) {
  const voteActivities = useMemo(() => {
    const voteMap: Record<string, VoteActivity> = {}
    
    // Get recent vote activities (last 3 seconds) and convert to VoteActivity format
    const recentActivities = activities
      .filter(activity => {
        const activityTime = new Date(activity.timestamp).getTime()
        const now = Date.now()
        return activity.type === 'vote_cast' && 
               activity.voteData && 
               (now - activityTime) < 3000 // 3 seconds
      })
      .slice(-5) // Keep only last 5 to avoid overwhelming UI
    
    recentActivities.forEach(activity => {
      if (activity.voteData) {
        voteMap[activity.voteData.stopId] = {
          id: activity.id,
          type: 'vote_cast',
          timestamp: activity.timestamp,
          stopId: activity.voteData.stopId,
          userId: activity.voteData.userId,
          username: activity.voteData.username,
          vote: activity.voteData.voteType
        }
      }
    })
    
    return voteMap
  }, [activities])
  
  return voteActivities
}