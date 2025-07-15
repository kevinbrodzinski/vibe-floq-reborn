import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { throttle } from 'lodash-es'

export interface Cluster {
  gh6: string
  centroid: { type: 'Point'; coordinates: [number, number] }
  total: number
  vibe_counts: Record<string, number>
}

export const useClusters = (
  bbox: [number, number, number, number] | null,
  precision = 6
) => {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | undefined>(undefined)

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
        setClusters(data || [])
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
    }
  }, [throttledFetch])

  return { clusters, loading, error }
}