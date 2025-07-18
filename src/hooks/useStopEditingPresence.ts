import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@supabase/auth-helpers-react'
import type { PlanStop } from '@/types/plan'

export interface StopEditingPresence {
  userId: string
  username: string
  stopId: string
  action: 'editing' | 'resizing' | 'dragging'
  startedAt: number
}

interface UseStopEditingPresenceOptions {
  planId: string
  enabled?: boolean
}

export function useStopEditingPresence({ planId, enabled = true }: UseStopEditingPresenceOptions) {
  const [editingPresences, setEditingPresences] = useState<Map<string, StopEditingPresence>>(new Map())
  const session = useSession()
  const user = session?.user
  const channelRef = useRef<any>()

  const channelName = `plan_editing_${planId}`

  useEffect(() => {
    if (!enabled || !user || !planId) return

    const channel = supabase.channel(channelName)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const newPresences = new Map<string, StopEditingPresence>()
        
        Object.entries(state).forEach(([userId, presences]) => {
          const presence = presences[0] as any // Get latest presence
          if (presence && userId !== user.id && presence.stopId) {
            newPresences.set(`${userId}_${presence.stopId}`, presence as StopEditingPresence)
          }
        })
        
        setEditingPresences(newPresences)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.userId !== user.id && presence.stopId) {
            setEditingPresences(prev => new Map(prev.set(`${presence.userId}_${presence.stopId}`, presence as StopEditingPresence)))
          }
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.userId && presence.stopId) {
            setEditingPresences(prev => {
              const next = new Map(prev)
              next.delete(`${presence.userId}_${presence.stopId}`)
              return next
            })
          }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, user, planId, channelName])

  const startEditing = (stopId: string, action: StopEditingPresence['action']) => {
    if (!user || !channelRef.current) return

    const presence: StopEditingPresence = {
      userId: user.id,
      username: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
      stopId,
      action,
      startedAt: Date.now()
    }

    channelRef.current.track(presence)
  }

  const stopEditing = (stopId: string) => {
    if (!user || !channelRef.current) return
    
    // Track with null to remove presence
    channelRef.current.untrack()
  }

  const getEditorsForStop = (stopId: string): StopEditingPresence[] => {
    return Array.from(editingPresences.values()).filter(presence => presence.stopId === stopId)
  }

  const isStopBeingEdited = (stopId: string, excludeActions?: StopEditingPresence['action'][]): boolean => {
    const editors = getEditorsForStop(stopId)
    if (excludeActions) {
      return editors.some(editor => !excludeActions.includes(editor.action))
    }
    return editors.length > 0
  }

  // Clean up stale presences
  useEffect(() => {
    const cleanup = setInterval(() => {
      setEditingPresences(prev => {
        const now = Date.now()
        const filtered = new Map()
        
        prev.forEach((presence, key) => {
          if (now - presence.startedAt < 30000) { // 30 seconds timeout
            filtered.set(key, presence)
          }
        })
        
        return filtered
      })
    }, 5000)

    return () => clearInterval(cleanup)
  }, [])

  return {
    editingPresences: Array.from(editingPresences.values()),
    startEditing,
    stopEditing,
    getEditorsForStop,
    isStopBeingEdited
  }
}