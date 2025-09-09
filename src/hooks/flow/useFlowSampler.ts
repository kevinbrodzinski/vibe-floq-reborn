import * as React from 'react'
import { useFlowRecorder } from '@/hooks/useFlowRecorder'     // your v1 recorder with SUI
import { appendFlowSegment } from '@/lib/api/flow'                 // already wired
import { getCurrentMap } from '@/lib/geo/mapSingleton'

type Opts = {
  /** meters; append a new segment after this much movement OR after maxIntervalMs */
  minDistanceM?: number
  /** ms; fallback max time between samples while recording */
  maxIntervalMs?: number
  /** meters; snap to map center if geolocation is unavailable */
  fallbackRadiusM?: number
}

export function useFlowSampler(opts: Opts = {}) {
  const {
    state, flowId, start, pause, resume, stop, append,
  } = useFlowRecorder() // already accumulates SUI
  const map = getCurrentMap()
  const watchIdRef = React.useRef<number | null>(null)
  const lastLocRef = React.useRef<{lng:number;lat:number; t:number} | null>(null)
  const timerRef = React.useRef<number | null>(null)

  const minDist = opts.minDistanceM ?? 35
  const maxGap  = opts.maxIntervalMs ?? 30_000
  const fallbackR = opts.fallbackRadiusM ?? 120

  const clearTimers = React.useCallback(() => {
    if (watchIdRef.current != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const distanceM = (a:{lng:number;lat:number}, b:{lng:number;lat:number}) => {
    const R=6371000, toRad=(x:number)=>x*Math.PI/180
    const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng)
    const s1=Math.sin(dLat/2)**2, s2=Math.sin(dLng/2)**2
    const c=2*Math.asin(Math.sqrt(s1+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2))
    return R*c
  }

  const scheduleFallback = React.useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(async () => {
      if (state !== 'recording' || !flowId) return
      // fallback: use map center if geolocation is absent
      const c = map?.getCenter?.()
      if (!c) return
      await append({
        center: { lng: c.lng, lat: c.lat },
        exposure_fraction: 0, // unknown
      })
      scheduleFallback()
    }, maxGap)
  }, [append, flowId, map, maxGap, state])

  const onPosition = React.useCallback(async (pos: GeolocationPosition) => {
    if (state !== 'recording' || !flowId) return
    const lng = pos.coords.longitude, lat = pos.coords.latitude
    const t   = pos.timestamp
    const now = { lng, lat, t }
    const last = lastLocRef.current

    let moved = true
    if (last) {
      moved = distanceM(last, now) >= minDist || (t - last.t) >= maxGap
    }

    if (moved) {
      await append({
        center: { lng, lat },
        exposure_fraction: 0, // recorder SUI uses solar; segment fraction is optional hint
      })
      lastLocRef.current = now
      scheduleFallback()
    }
  }, [append, flowId, maxGap, minDist, scheduleFallback, state])

  const onError = React.useCallback((_e: GeolocationPositionError) => {
    // if permission denied, switch to fallback loop
    scheduleFallback()
  }, [scheduleFallback])

  const begin = React.useCallback(async (visibility: 'owner'|'friends'|'public'='owner') => {
    if (state === 'recording') return
    await start() // flow-start already accepts visibility in our updated edge (pass it there if you expose)
    // Try to seed with map center as start_location (already captured in edge if you add it to call)
    lastLocRef.current = null

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true, maximumAge: 5000, timeout: 12000,
      })
    } else {
      scheduleFallback()
    }
  }, [onPosition, onError, scheduleFallback, start, state])

  const halt = React.useCallback(async () => {
    clearTimers()
    await stop()
  }, [clearTimers, stop])

  const pauseRec = React.useCallback(() => {
    if (state === 'recording') {
      clearTimers()
      pause()
    }
  }, [clearTimers, pause, state])

  const resumeRec = React.useCallback(() => {
    if (state === 'paused') {
      resume()
      // restart watches
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
          enableHighAccuracy: true, maximumAge: 5000, timeout: 12000,
        })
      } else {
        scheduleFallback()
      }
    }
  }, [onError, onPosition, resume, scheduleFallback, state])

  React.useEffect(() => () => clearTimers(), [clearTimers])

  return {
    state,
    flowId,
    begin,
    pause: pauseRec,
    resume: resumeRec,
    stop: halt,
  }
}