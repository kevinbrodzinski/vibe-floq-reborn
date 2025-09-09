import * as React from 'react'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { fetchFlowVenues, fetchConvergence } from '@/lib/api/flow'
import type { FlowFilters, TileVenue, ConvergencePoint } from '@/lib/flow/types'

type UseFlowExploreArgs = {
  lens: 'explore' | 'constellation' | 'temporal'
  map?: mapboxgl.Map | null
  filters: FlowFilters
  debounceMs?: number
  onLatencyMs?: (ms: number) => void
}
type UseFlowExploreReturn = {
  venues: TileVenue[]
  convergence: ConvergencePoint[]
  clusterRes: number
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useFlowExplore({
  lens,
  map = getCurrentMap(),
  filters,
  debounceMs = 250,
  onLatencyMs,
}: UseFlowExploreArgs): UseFlowExploreReturn {
  const [venues, setVenues] = React.useState<TileVenue[]>([])
  const [convergence, setConvergence] = React.useState<ConvergencePoint[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string|null>(null)

  const z = map?.getZoom?.() ?? 14
  const baseRes = z >= 15 ? 10 : z >= 13 ? 9 : 8
  const densityOffset = (d?: 'loose'|'normal'|'tight') => d === 'tight' ? +1 : d === 'loose' ? -1 : 0
  const clusterRes = Math.max(7, Math.min(11, baseRes + densityOffset(filters.clusterDensity)))

  const bboxOrNull = React.useCallback((): [number,number,number,number] | null => {
    const b = map?.getBounds?.()
    return b ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] : null
  }, [map])

  const load = React.useCallback(async () => {
    if (!map || lens !== 'explore') return
    const bbox = bboxOrNull()
    if (!bbox) return
    setLoading(true); setError(null)
    const start = performance.now()
    try {
      const zoomNow = map.getZoom?.() ?? 14
      const [{ venues }, { points }] = await Promise.all([
        fetchFlowVenues({ bbox, filters }),
        fetchConvergence({ bbox, zoom: zoomNow, res: clusterRes }),
      ])
      setVenues(venues); setConvergence(points)
      onLatencyMs?.(Math.round(performance.now() - start))
    } catch (e: any) {
      console.error('[useFlowExplore] load error:', e)
      setVenues([]); setConvergence([])
      setError(e?.message ?? 'Failed to load flow data')
    } finally {
      setLoading(false)
    }
  }, [map, lens, filters, clusterRes, bboxOrNull, onLatencyMs])

  React.useEffect(() => {
    if (!map || lens !== 'explore') return
    let cancel = false
    let t: number | undefined
    const debounced = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => { if (!cancel) load() }, debounceMs)
    }
    debounced()
    map.on?.('moveend', debounced)
    map.on?.('zoomend', debounced)
    return () => {
      cancel = true
      map.off?.('moveend', debounced)
      map.off?.('zoomend', debounced)
      window.clearTimeout(t)
    }
  }, [map, lens, filters, clusterRes, debounceMs, load])

  return { venues, convergence, clusterRes, loading, error, refresh: load }
}