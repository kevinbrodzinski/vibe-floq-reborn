import * as React from 'react'
import { startFlow, appendFlowSegment, endFlow } from '@/lib/api/flow'
import { solarElevationDeg, sunExposure01 } from '@/lib/geo/sun'

type RecState = 'idle'|'recording'|'paused'|'ended'
type RecSegment = {
  idx: number
  arrived_at: string
  departed_at?: string
  center?: { lng: number; lat: number }
  venue_id?: string
  exposure_fraction?: number   // 0..1 (outdoor fraction you infer)
  vibe_vector?: { energy?: number; valence?: number }
  weather_class?: string       // e.g. 'clear','cloudy'
  cloud_cover01?: number       // optional, 0..1 if you have it
}

export function useFlowRecorder() {
  const [state, setState] = React.useState<RecState>('idle')
  const [flowId, setFlowId] = React.useState<string | null>(null)
  const [segments, setSegments] = React.useState<RecSegment[]>([])

  // SUI accumulators
  const [sui01, setSui01] = React.useState(0)          // 0..1
  const [sunExposedMin, setSunExposedMin] = React.useState(0)
  const [elapsedMin, setElapsedMin] = React.useState(0)

  const idxRef = React.useRef(0)
  const startedAtRef = React.useRef<number | null>(null)
  const lastSampleAtRef = React.useRef<number | null>(null)

  const start = React.useCallback(async () => {
    if (state !== 'idle' && state !== 'ended') return
    const { flowId } = await startFlow()
    setFlowId(flowId)
    setState('recording')
    idxRef.current = 0
    const now = Date.now()
    startedAtRef.current = now
    lastSampleAtRef.current = now
    // reset SUI
    setSui01(0); setSunExposedMin(0); setElapsedMin(0)
    setSegments([])
  }, [state])

  // internal: accumulate SUI between last sample and now
  const accumulateSun = React.useCallback((opts: {
    center?: { lng: number; lat: number }
    exposure_fraction?: number
    cloud_cover01?: number
  }) => {
    const now = Date.now()
    const last = lastSampleAtRef.current ?? now
    const dtMin = Math.max(0, (now - last) / 60000)
    lastSampleAtRef.current = now

    const start = startedAtRef.current ?? now
    const totalMin = Math.max(0, (now - start) / 60000)

    // Compute exposure sample
    let sample = 0
    if (opts.center) {
      const elev = solarElevationDeg(new Date(), opts.center.lat, opts.center.lng)
      const exposureSolar = sunExposure01(elev, { cloudCover01: opts.cloud_cover01 ?? 0.0, isOutdoor: true })
      const exposureSeg   = typeof opts.exposure_fraction === 'number' ? Math.max(0, Math.min(1, opts.exposure_fraction)) : undefined
      // Prefer the larger signal (if you know you're outdoor with high fraction, let that dominate)
      sample = Math.max(exposureSolar, exposureSeg ?? 0)
    }

    const addMin = dtMin * sample
    const newSun = sunExposedMin + addMin
    setSunExposedMin(newSun)
    setElapsedMin(totalMin)
    setSui01(totalMin > 0 ? Math.max(0, Math.min(1, newSun / totalMin)) : 0)
  }, [sunExposedMin])

  const append = React.useCallback(async (seg: Omit<RecSegment,'idx'|'arrived_at'> & {
    arrived_at?: string
  }) => {
    if (!flowId || state !== 'recording') return
    // accumulate sun exposure since last sample
    accumulateSun({
      center: seg.center,
      exposure_fraction: seg.exposure_fraction,
      cloud_cover01: seg.cloud_cover01,
    })

    const s: RecSegment = {
      idx: idxRef.current++,
      arrived_at: seg.arrived_at ?? new Date().toISOString(),
      ...seg
    }
    await appendFlowSegment({ flowId, segment: s })
    setSegments(prev => [...prev, s])
  }, [flowId, state, accumulateSun])

  const pause = React.useCallback(() => {
    if (state === 'recording') setState('paused')
  }, [state])

  const resume = React.useCallback(() => {
    if (state === 'paused') {
      setState('recording')
      // anchor the last sample to now so we don't credit paused time
      lastSampleAtRef.current = Date.now()
    }
  }, [state])

  const stop = React.useCallback(async () => {
    if (!flowId || (state !== 'recording' && state !== 'paused')) return
    // final accumulate (no center, no credit if we don't know where we are)
    accumulateSun({})
    await endFlow(flowId, { sun_exposed_min: Math.round(sunExposedMin) })
    setState('ended')
  }, [flowId, state, sunExposedMin, accumulateSun])

  return {
    state, flowId, segments,
    // Live SUI
    sui01,            // 0..1
    sunExposedMin,    // minutes in sun (weighted)
    elapsedMin,       // total minutes in flow
    // Controls
    start, append, pause, resume, stop,
  }
}