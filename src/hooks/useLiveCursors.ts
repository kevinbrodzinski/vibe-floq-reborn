import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@supabase/auth-helpers-react'

export interface LiveCursor {
  profileId: string
  username: string
  x: number
  y: number
  lastSeen: number
  isEditing?: boolean
  editingStopId?: string
}

interface UseLiveCursorsOptions {
  planId: string
  enabled?: boolean
}

export function useLiveCursors({ planId, enabled = true }: UseLiveCursorsOptions) {
  const [cursors, setCursors] = useState<Map<string, LiveCursor>>(new Map())
  const [myPosition, setMyPosition] = useState<{ x: number; y: number } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setTimeout>>()
  const session = useSession()
  const user = session?.user

  const channelName = `plan_cursors_${planId}`

  useEffect(() => {
    if (!enabled || !user || !planId) return

    const channel = supabase.channel(channelName)

    // Track presence for cursor positions
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const newCursors = new Map<string, LiveCursor>()
        
        Object.entries(state).forEach(([profileId, presences]) => {
          const presence = presences[0] // Get latest presence
          if (presence && profileId !== user.id) {
            newCursors.set(profileId, {
              profileId,
              username: (presence as any).username || 'Anonymous',
              x: (presence as any).x || 0,
              y: (presence as any).y || 0,
              lastSeen: Date.now()
            })
          }
        })
        
        setCursors(newCursors)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.userId !== user.id) {
            setCursors(prev => new Map(prev.set(presence.userId, {
              profileId: presence.userId,
              username: presence.username || 'Anonymous',
              x: presence.x || 0,
              y: presence.y || 0,
              lastSeen: Date.now()
            })))
          }
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          setCursors(prev => {
            const next = new Map(prev)
            next.delete(presence.userId)
            return next
          })
        })
      })
      .subscribe()

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = { x: e.clientX, y: e.clientY }
      setMyPosition(newPosition)
      
      // Throttle cursor updates
      if (!intervalRef.current) {
        intervalRef.current = setTimeout(() => {
          channel.track({
            profileId: user.id,
            username: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
            x: newPosition.x,
            y: newPosition.y,
            lastSeen: Date.now()
          })
          intervalRef.current = undefined
        }, 50) // 20fps cursor updates
      }
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [enabled, user, planId, channelName])

  const updateEditingStatus = (isEditing: boolean, editingStopId?: string) => {
    if (!user) return
    
    const channel = supabase.channel(channelName)
    channel.track({
      profileId: user.id,
      username: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
      x: myPosition?.x || 0,
      y: myPosition?.y || 0,
      lastSeen: Date.now(),
      isEditing,
      editingStopId
    })
  }

  // Clean up stale cursors
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCursors(prev => {
        const now = Date.now()
        const filtered = new Map()
        
        prev.forEach((cursor, profileId) => {
          if (now - cursor.lastSeen < 5000) { // 5 seconds timeout
            filtered.set(profileId, cursor)
          }
        })
        
        return filtered
      })
    }, 1000)

    return () => clearInterval(cleanup)
  }, [])

  return {
    cursors: Array.from(cursors.values()),
    myPosition,
    updateEditingStatus
  }
}