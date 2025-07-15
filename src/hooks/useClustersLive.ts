import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Cluster } from './useClusters'

export const useClustersLive = (
  initial: Cluster[],
  setClusters: (fn: (prev: Cluster[]) => Cluster[]) => void,
  refetchClusters: () => void
) => {
  const channelRef = useRef<any>(null)
  const joined = useRef(false)
  const lastChecksumRef = useRef<string | null>(null)

  useEffect(() => {
    if (joined.current || initial.length > 300) return // Guard rail: skip for large datasets
    joined.current = true

    if (import.meta.env.DEV) console.log('[useClustersLive] Starting live subscription')

    const channel = supabase
      .channel('clusters-updates-live')
      .on(
        'broadcast',
        { event: 'clusters_updated' },
        (payload) => {
          try {
            const { checksum } = payload.payload ?? {}
            if (checksum && checksum !== lastChecksumRef.current) {
              lastChecksumRef.current = checksum
              if (import.meta.env.DEV) {
                console.log('[useClustersLive] Checksum changed → refetching clusters')
              }
              refetchClusters() // Hard refetch when checksum changes
            }
          } catch (e) {
            console.error('[useClustersLive] Error processing broadcast:', e)
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('[useClustersLive] Subscription status:', status)
        }
      })

    channelRef.current = channel

    return () => {
      if (import.meta.env.DEV) console.log('[useClustersLive] Cleaning up subscription')
      channel.unsubscribe()
      joined.current = false
    }
  }, [initial.length, refetchClusters])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])
}