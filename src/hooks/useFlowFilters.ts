import * as React from 'react'
import type { FlowFilters } from '@/lib/flow/types'
import storage from '@/lib/storage/appStorage'

const STORAGE_KEY = 'floq:flow:filters:v1'

const DEFAULT: FlowFilters = {
  friendFlows: true,
  weatherPref: [],
  clusterDensity: 'normal',
  queue: 'any',
}

function isDensity(x: any): x is 'loose'|'normal'|'tight' {
  return x === 'loose' || x === 'normal' || x === 'tight'
}
function isQueue(x: any): x is 'any'|'short'|'none' {
  return x === 'any' || x === 'short' || x === 'none'
}
function clamp01(n: any) {
  const v = Number(n)
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined
}
function sanitize(raw: any): FlowFilters {
  const f: FlowFilters = { ...DEFAULT }
  if (typeof raw?.friendFlows === 'boolean') f.friendFlows = raw.friendFlows
  if (Array.isArray(raw?.weatherPref)) f.weatherPref = raw.weatherPref.map(String)
  if (isDensity(raw?.clusterDensity)) f.clusterDensity = raw.clusterDensity
  if (isQueue(raw?.queue)) f.queue = raw.queue
  if (Array.isArray(raw?.vibeRange) && raw.vibeRange.length === 2) {
    const a = clamp01(raw.vibeRange[0]); const b = clamp01(raw.vibeRange[1])
    if (a !== undefined && b !== undefined && a <= b) f.vibeRange = [a, b]
  }
  if (raw?.timeWindow?.start && raw?.timeWindow?.end) {
    try {
      f.timeWindow = {
        start: new Date(raw.timeWindow.start).toISOString(),
        end:   new Date(raw.timeWindow.end).toISOString()
      }
    } catch {}
  }
  return f
}

async function readStored(): Promise<FlowFilters> {
  try {
    const s = await storage.getItem(STORAGE_KEY)
    return s ? sanitize(JSON.parse(s)) : DEFAULT
  } catch { return DEFAULT }
}

export function useFlowFilters(initial?: Partial<FlowFilters>) {
  const [filters, setFiltersState] = React.useState<FlowFilters>(DEFAULT)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      const s = await readStored()
      if (!mounted) return
      setFiltersState({ ...DEFAULT, ...s, ...initial })
      setLoaded(true)
    })()
    return () => { mounted = false }
  }, [initial])

  React.useEffect(() => {
    if (!loaded) return
    const t = window.setTimeout(() => {
      storage.setItem(STORAGE_KEY, JSON.stringify(filters)).catch(() => {})
    }, 60)
    return () => window.clearTimeout(t)
  }, [filters, loaded])

  const setFilters = React.useCallback((patch: Partial<FlowFilters>) => {
    setFiltersState(prev => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = React.useCallback(() => setFiltersState(DEFAULT), [])

  const cycleDensity = React.useCallback(() => {
    setFiltersState(prev => {
      const d = prev.clusterDensity ?? 'normal'
      const next = d === 'loose' ? 'normal' : d === 'normal' ? 'tight' : 'loose'
      return { ...prev, clusterDensity: next }
    })
  }, [])

  return { filters, setFilters, resetFilters, cycleDensity, loaded }
}