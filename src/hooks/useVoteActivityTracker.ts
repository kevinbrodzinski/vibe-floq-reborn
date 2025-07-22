import { useEffect, useRef, useState } from 'react'

export interface VoteActivity {
  id: string
  type: 'vote_cast'
  timestamp: string
  stopId: string
  userId: string
  username: string
  vote: 'up' | 'down'
}

export function useVoteActivityTracker(
  liveActivities: VoteActivity[]      // ← new prop coming from the parent
) {
  /** overlays keyed by stopId */
  const [overlays, setOverlays] = useState<Record<string, VoteActivity>>({})

  /** keep timeout ids so we can clear them */
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  /* listen to live vote events */
  useEffect(() => {
    if (!liveActivities.length) return

    liveActivities.forEach(a => {
      // show (or replace) overlay for this stop
      setOverlays(prev => ({ ...prev, [a.stopId]: a }))

      // clear any previous timer for this stop
      if (timersRef.current[a.stopId]) clearTimeout(timersRef.current[a.stopId])

      // hide after 2 s
      timersRef.current[a.stopId] = setTimeout(() => {
        setOverlays(prev => {
          const { [a.stopId]: _, ...rest } = prev
          return rest
        })
        delete timersRef.current[a.stopId]
      }, 2000)
    })
  }, [liveActivities])

  /* tidy up on unmount */
  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach(clearTimeout)
    },
    []
  )

  return overlays            // { stopId → last-vote-activity }
}