import * as React from 'react'
import type mapboxgl from 'mapbox-gl'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { fetchFlowVenues } from '@/lib/api/flow'
import type { FlowFilters, TileVenue, ConvergencePoint } from '@/lib/flow/types'

type Args = {
  lens: 'explore' | 'constellation' | 'temporal'
  filters: FlowFilters
  map?: mapboxgl.Map | null
  debounceMs?: number
  onLatencyMs?: (ms: number) => void
}
type Ret = {
  venues: TileVenue[]
  convergence: ConvergencePoint[]
  clusterRes: number
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useFlowExplore({
  lens,
  filters,
  map = getCurrentMap(),
  debounceMs = 250,
  onLatencyMs,
}: Args): Ret {
  const [venues, setVenues] = React.useState<TileVenue[]>([])
  const [convergence, setConvergence] = React.useState<ConvergencePoint[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // compute H3 res from zoom + density
  const { zoom, clusterRes } = React.useMemo(() => {
    const z = map?.getZoom?.() ?? 14
    const base = z >= 15 ? 10 : z >= 13 ? 9 : 8
    const off =
      filters.clusterDensity === 'tight' ? +1 : filters.clusterDensity === 'loose' ? -1 : 0
    const res = Math.max(7, Math.min(11, base + off))
    return { zoom: z, clusterRes: res }
  }, [map, filters.clusterDensity])

  const bboxOrNull = React.useCallback((): [number, number, number, number] | null => {
    const b = map?.getBounds?.()
    return b ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] : null
  }, [map])

  // Prevent race conditions when panning/zooming quickly
  const requestIdRef = React.useRef(0)

  const load = React.useCallback(async () => {
    if (!map || lens !== 'explore') return
    const bbox = bboxOrNull()
    if (!bbox) return

    const rid = ++requestIdRef.current
    setLoading(true)
    setError(null)

    const t0 = performance.now()
    try {
      const { venues } = await fetchFlowVenues({ bbox, filters });
      if (rid === requestIdRef.current) {
        setVenues(venues)
        setConvergence([]) // Empty for now
        onLatencyMs?.(Math.round(performance.now() - t0))
      }
    } catch (e: any) {
      if (rid === requestIdRef.current) {
        console.error('[useFlowExplore] load error:', e)
        setVenues([])
        setConvergence([])
        setError(e?.message ?? 'Failed to load flow data')
      }
    } finally {
      if (rid === requestIdRef.current) setLoading(false)
    }
  }, [map, lens, filters, zoom, clusterRes, bboxOrNull, onLatencyMs])

  // Debounced moveend/zoomend + react to chip changes
  React.useEffect(() => {
    if (!map || lens !== 'explore') return
    let cancel = false
    let t: number | undefined
    const debounced = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        if (!cancel) load()
      }, debounceMs)
    }
    debounced() // initial load
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