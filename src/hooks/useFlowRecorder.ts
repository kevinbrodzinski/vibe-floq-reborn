import * as React from 'react'
import { startFlow, appendFlowSegment, endFlow } from '@/lib/api/flow'

type RecorderState = 'idle'|'recording'|'paused'|'ended'
type RecSegment = {
  idx: number
  arrived_at: string
  departed_at?: string
  center?: { lng:number; lat:number }
  venue_id?: string
  exposure_fraction?: number
  vibe_vector?: { energy?: number; valence?: number }
  weather_class?: string
}

export function useFlowRecorder() {
  const [state, setState] = React.useState<RecorderState>('idle')
  const [flowId, setFlowId] = React.useState<string | null>(null)
  const [segments, setSegments] = React.useState<RecSegment[]>([])
  const idxRef = React.useRef(0)

  const start = React.useCallback(async () => {
    if (state !== 'idle' && state !== 'ended') return
    const { flowId } = await startFlow()
    setFlowId(flowId)
    setState('recording')
    idxRef.current = 0
  }, [state])

  const append = React.useCallback(async (seg: Omit<RecSegment,'idx'>) => {
    if (!flowId || state !== 'recording') return
    const s: RecSegment = { idx: idxRef.current++, arrived_at: new Date().toISOString(), ...seg }
    await appendFlowSegment({ flowId, segment: s })
    setSegments(prev => [...prev, s])
  }, [flowId, state])

  const pause = React.useCallback(() => {
    if (state === 'recording') setState('paused')
  }, [state])

  const resume = React.useCallback(() => {
    if (state === 'paused') setState('recording')
  }, [state])

  const stop = React.useCallback(async () => {
    if (!flowId || (state !== 'recording' && state !== 'paused')) return
    await endFlow(flowId)
    setState('ended')
  }, [flowId, state])

  return { state, flowId, segments, start, append, pause, resume, stop }
}