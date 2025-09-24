import * as React from 'react'
import { fetchForecast } from '@/lib/api/forecastClient'
import { getCurrentMap } from '@/lib/geo/mapSingleton'

/**
 * Computes a 0..1 "sun opportunity" score based on forecast NOW cells inside viewport.
 * Heuristic: higher temperature & lower humidity → more sun opportunity.
 * Adjust or swap with your weather indices anytime.
 */
export function useSunOpportunity(enabled: boolean) {
  const map = getCurrentMap()
  const [score, setScore] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)

  const compute = React.useCallback(async () => {
    if (!enabled || !map) return
    const b = map.getBounds?.(); if (!b) return
    setLoading(true)
    try {
      const response = await fetchForecast({
        t: 'now',
        center: [ (b.getWest()+b.getEast())/2, (b.getSouth()+b.getNorth())/2 ],
        bbox: [ b.getWest(), b.getSouth(), b.getEast(), b.getNorth() ],
        zoom: map.getZoom?.() ?? 14
      })
      const cells = response.cells ?? []
      if (!cells.length) { setScore(0); return }

      // simple heuristic: temp high and humidity low
      let s = 0
      for (const c of cells) {
        const t = c.temperature ?? 0.5 // 0..1
        const h = c.humidity ?? 0.5    // 0..1
        s += Math.max(0, t - 0.4) * (1 - h)    // favor warm & dry
      }
      s = s / cells.length
      setScore(Math.max(0, Math.min(1, s)))
    } catch (error) {
      console.warn('[useSunOpportunity] forecast error:', error)
      setScore(0)
    } finally {
      setLoading(false)
    }
  }, [enabled, map])

  React.useEffect(() => {
    if (!enabled) return
    compute()
    const onMove = () => compute()
    map?.on?.('moveend', onMove)
    map?.on?.('zoomend', onMove)
    return () => {
      map?.off?.('moveend', onMove)
      map?.off?.('zoomend', onMove)
    }
  }, [enabled, compute, map])

  return { score, loading, refresh: compute }
}