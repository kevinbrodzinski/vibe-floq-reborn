import * as React from 'react'
import { useFlowRecorder } from '@/hooks/useFlowRecorder'
import { useFriendFlows } from '@/components/field/hooks/useFriendFlows'
import { useFlowHUD } from '@/components/flow/hooks/useFlowHUD'
import { getCurrentMap } from '@/lib/geo/mapSingleton'

type FlowMetrics = {
  flowPct: number         // 0..100
  syncPct: number         // 0..100
  elapsedMin: number      // minutes
  sui01: number           // 0..1
  // raw access if needed
  raw: {
    momentum: ReturnType<typeof useFlowHUD>['momentum'] | null
    cohesion: ReturnType<typeof useFlowHUD>['cohesion'] | null
  }
}

const FlowMetricsCtx = React.createContext<FlowMetrics | null>(null)

type ProviderProps = {
  /** Optionally provide a map instance; if omitted we use getCurrentMap() */
  map?: mapboxgl.Map | null
  /** Optional children to wrap */
  children: React.ReactNode
}

export function FlowMetricsProvider({ map = getCurrentMap(), children }: ProviderProps) {
  // 1) recorder → path + energy samples
  const recorder = useFlowRecorder()

  const pathPoints = React.useMemo(() => {
    const segs = recorder?.segments ?? []
    return segs
      .filter(s => !!s.center)
      .map(s => ({
        lng: s.center!.lng,
        lat: s.center!.lat,
        t: new Date(s.arrived_at ?? Date.now()).getTime(),
      }))
  }, [recorder?.segments])

  const energySamples = React.useMemo(() => {
    const segs = recorder?.segments ?? []
    return segs
      .map(s =>
        s?.vibe_vector?.energy != null
          ? { t: new Date(s.arrived_at ?? Date.now()).getTime(), energy: s.vibe_vector.energy }
          : null
      )
      .filter(Boolean) as Array<{ t: number; energy: number }>
  }, [recorder?.segments])

  // 2) friend flows → cohesion inputs
  const friendFlows = useFriendFlows(map)

  const hud = useFlowHUD({
    energy: energySamples.length > 0 ? energySamples : [
      { t: Date.now() - 300000, energy: 0.7 },
      { t: Date.now(), energy: 0.8 }
    ],
    myPath: pathPoints.length > 0 ? pathPoints : [
      { lng: -118.4695, lat: 33.9855, t: Date.now() - 300000 }
    ],
    friendFlows: (friendFlows ?? []).map(f => ({
      head_lng: f.head_lng,
      head_lat: f.head_lat,
      t_head: f.t_head,
    })),
  })

  // 3) derive the four values we surface everywhere
  const value: FlowMetrics = React.useMemo(() => {
    const flowPct = Math.round(Math.min(1, Math.max(0, hud.momentum?.mag ?? 0)) * 100)
    const syncPct = Math.round(Math.min(1, Math.max(0, hud.cohesion?.cohesion ?? 0)) * 100)
    const elapsedMin = Math.max(0, Math.floor(recorder?.elapsedMin ?? 0))
    const sui01 = Math.min(1, Math.max(0, recorder?.sui01 ?? 0.75))

    return {
      flowPct,
      syncPct,
      elapsedMin,
      sui01,
      raw: { momentum: hud.momentum ?? null, cohesion: hud.cohesion ?? null },
    }
  }, [hud.momentum, hud.cohesion, recorder?.elapsedMin, recorder?.sui01])

  return <FlowMetricsCtx.Provider value={value}>{children}</FlowMetricsCtx.Provider>
}

export function useFlowMetrics() {
  const ctx = React.useContext(FlowMetricsCtx)
  if (!ctx) {
    // Safe default (prevents crashes if someone calls hook outside provider)
    return { flowPct: 0, syncPct: 0, elapsedMin: 0, sui01: 0, raw: { momentum: null, cohesion: null } } as FlowMetrics
  }
  return ctx
}