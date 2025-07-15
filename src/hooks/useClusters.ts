import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { throttle } from 'lodash-es'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Cluster {
  gh6: string
  centroid: { type: 'Point'; coordinates: [number, number] }
  total: number
  vibe_counts: Record<string, number>
  fillRgb?: [number, number, number]
  totalNorm?: number
}

export const useClusters = (
  bbox: [number, number, number, number] | null,
  precision = 6
) => {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const lastDataRef = useRef<Cluster[]>([]) // Move this inside the hook
  const channelRef = useRef<RealtimeChannel | undefined>(undefined)
  const realTimeThrottleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchClusters = useCallback(
    async (box: [number, number, number, number]) => {
      // Cancel previous request
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        if (import.meta.env.DEV) console.log(`[useClusters] Fetching clusters for bbox: ${box.join(',')}, precision: ${precision}`)

        const { data, error } = await supabase.functions.invoke('clusters', {
          body: { bbox: box, precision },
        })

        if (error) {
          console.error('[useClusters] Error:', error)
          setError(error.message || 'Failed to fetch clusters')
          setClusters([])
          return
        }

        if (import.meta.env.DEV) console.log(`[useClusters] Received ${data?.length || 0} clusters`)
        
        // Process clusters with visual properties
        const processedClusters = (data || []).map((cluster: any) => ({
          ...cluster,
          fillRgb: [100, 150, 255] as [number, number, number], // Default blue
          totalNorm: cluster.total / Math.max(...(data || []).map((c: any) => c.total), 1)
        }))
        
        setClusters(processedClusters)
        lastDataRef.current = processedClusters
        setError(null)

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[useClusters] Fetch error:', err)
          setError(err.message || 'Failed to fetch clusters')
          setClusters([])
        }
      } finally {
        setLoading(false)
      }
    },
    [precision]
  )

  // Throttle network requests to once every 750ms
  const throttledFetch = useRef(throttle(fetchClusters, 750)).current

  // Real-time subscription with throttling to prevent spam
  const handleRealTimeUpdate = useCallback(() => {
    if (realTimeThrottleRef.current) {
      clearTimeout(realTimeThrottleRef.current)
    }
    
    // Throttle real-time updates to every 2 seconds
    realTimeThrottleRef.current = setTimeout(() => {
      if (bbox) {
        if (import.meta.env.DEV) console.log('[useClusters] Real-time update triggered')
        setLastUpdateTime(new Date())
        fetchClusters(bbox)
      }
    }, 2000)
  }, [bbox, fetchClusters])

  // Set up real-time subscription using broadcast channel (listening for checksum changes)
  useEffect(() => {
    if (!bbox || clusters.length > 300) return // Guard rail: skip for large datasets

    const channel = supabase
      .channel('clusters-updates-live')
      .on(
        'broadcast',
        { event: 'clusters_updated' },
        (payload) => {
          try {
            const { checksum } = payload.payload ?? {}
            if (checksum) {
              if (import.meta.env.DEV) {
                console.log('[useClusters] Checksum changed → refetching clusters')
              }
              setLastUpdateTime(new Date())
              fetchClusters(bbox)
            }
          } catch (e) {
            console.error('[useClusters] Error processing broadcast:', e)
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log('[useClusters] Subscription status:', status)
        setIsRealTimeConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      setIsRealTimeConnected(false)
    }
  }, [bbox, fetchClusters, clusters.length])

  useEffect(() => {
    if (bbox) {
      throttledFetch(bbox)
    }
  }, [bbox, throttledFetch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      throttledFetch.cancel()
      channelRef.current?.unsubscribe()
      setIsRealTimeConnected(false)
    }
  }, [throttledFetch])

  return { 
    clusters, 
    loading, 
    error, 
    isRealTimeConnected, 
    lastUpdateTime 
  }
}