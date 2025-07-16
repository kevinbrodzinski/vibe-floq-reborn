import { useState, useCallback } from 'react'

export function usePresence(planId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [lastActivity, setLastActivity] = useState<Record<string, number>>({})

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!planId) return
    
    // Update local typing state
    setTypingUsers(prev => {
      if (isTyping) {
        return prev.includes('current-user') ? prev : [...prev, 'current-user']
      } else {
        return prev.filter(id => id !== 'current-user')
      }
    })
    
    // Update activity timestamp
    setLastActivity(prev => ({
      ...prev,
      'current-user': Date.now()
    }))
  }, [planId])

  const updateActivity = useCallback((userId: string) => {
    setLastActivity(prev => ({
      ...prev,
      [userId]: Date.now()
    }))
  }, [])

  const isUserActive = useCallback((userId: string) => {
    const activity = lastActivity[userId]
    if (!activity) return false
    return Date.now() - activity < 60000 // Active if seen in last minute
  }, [lastActivity])

  return {
    typingUsers,
    broadcastTyping,
    updateActivity,
    isUserActive
  }
}