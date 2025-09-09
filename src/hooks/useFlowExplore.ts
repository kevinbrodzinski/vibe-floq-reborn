import * as React from 'react'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { fetchFlowVenues, fetchConvergence } from '@/lib/api/flow'
import type { FlowFilters, TileVenue, ConvergencePoint } from '@/lib/flow/types'

type UseFlowExploreArgs = {
  /** Current lens; hook only activates when 'explore' */
  lens: 'explore' | 'constellation' | 'temporal'
  /** Optional Mapbox instance; by default we read from the singleton */
  map?: mapboxgl.Map | null
  /** Initial filters */
  initialFilters?: FlowFilters
  /** Debounce in ms for moveend */
  debounceMs?: number
}

type UseFlowExploreReturn = {
  filters: FlowFilters
  setFilters: (f: FlowFilters) => void
  venues: TileVenue[]
  convergence: ConvergencePoint[]
  clusterRes: number
  loading: boolean
  error: string | null
  /** manual refresh (rarely needed) */
  refresh: () => void
}

export function useFlowExplore({
  lens,
  map = getCurrentMap(),
  initialFilters = { friendFlows: true, weatherPref: [], clusterDensity: 'normal' },
  debounceMs = 250,
}: UseFlowExploreArgs): UseFlowExploreReturn {
  const [filters, setFilters] = React.useState<FlowFilters>(initialFilters)
  const [venues, setVenues] = React.useState<TileVenue[]>([])
  const [convergence, setConvergence] = React.useState<ConvergencePoint[]>([])
  const [loading, setLoading] = React.useState(false)  
  const [error, setError] = React.useState<string|null>(null)

  // Request deduplication for performance
  const requestIdRef = React.useRef(0)

  // Memoized zoom and resolution calculations for performance
  const { zoom, clusterRes } = React.useMemo(() => {
    const z = map?.getZoom?.() ?? 14
    const baseRes = z >= 15 ? 10 : z >= 13 ? 9 : 8
    const densityOffset = (d?: 'loose'|'normal'|'tight') => d === 'tight' ? +1 : d === 'loose' ? -1 : 0
    const res = Math.max(7, Math.min(11, baseRes + densityOffset(filters.clusterDensity)))
    return { zoom: z, clusterRes: res }
  }, [map, filters.clusterDensity])

  // internal: compute bbox from map
  const computeBbox = React.useCallback((): [number,number,number,number] | null => {
    const b = map?.getBounds?.()
    if (!b) return null
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
  }, [map])

  const load = React.useCallback(async () => {
    if (!map || lens !== 'explore') return
    const bbox = computeBbox()
    if (!bbox) return

    // Request deduplication - cancel previous requests
    const requestId = ++requestIdRef.current
    
    setLoading(true)
    setError(null)
    
    try {
      const [{ venues }, { points }] = await Promise.all([
        fetchFlowVenues({ bbox, filters }),
        fetchConvergence({ bbox, zoom, res: clusterRes }),
      ])
      
      // Only update if this is still the latest request
      if (requestId === requestIdRef.current) {
        setVenues(venues)
        setConvergence(points)
      }
    } catch (e: any) {
      // Only show error if this is still the latest request
      if (requestId === requestIdRef.current) {
        console.error('[useFlowExplore] load error:', e)
        setVenues([])
        setConvergence([])
        setError(e?.message ?? 'Failed to load flow data')
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [map, lens, filters, clusterRes, computeBbox, zoom])

  // Debounced moveend + react to filters/zoom changes
  React.useEffect(() => {
    if (!map || lens !== 'explore') return
    let cancel = false
    let t: number | undefined

    const debounced = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => { if (!cancel) load() }, debounceMs)
    }

    debounced()                         // initial
    map.on?.('moveend', debounced)
    map.on?.('zoomend', debounced)      // keep in sync with res

    return () => {
      cancel = true
      map.off?.('moveend', debounced)
      map.off?.('zoomend', debounced)
      window.clearTimeout(t)
    }
  }, [map, lens, filters, clusterRes, debounceMs, load])

  return {
    filters,
    setFilters,
    venues,
    convergence,
    clusterRes,
    loading,
    error,
    refresh: load,
  }
}