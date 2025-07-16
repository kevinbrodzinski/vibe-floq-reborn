import { useState, useCallback } from 'react'
import type { PlanStop } from '@/types/plan'

interface UseStopResizeProps {
  onUpdateDuration: (stopId: string, duration: number) => void
}

export function useStopResize({ onUpdateDuration }: UseStopResizeProps) {
  const [resizingStop, setResizingStop] = useState<string | null>(null)
  const [startY, setStartY] = useState(0)
  const [startDuration, setStartDuration] = useState(0)

  const startResize = useCallback((stopId: string, stop: PlanStop, clientY: number) => {
    setResizingStop(stopId)
    setStartY(clientY)
    setStartDuration(stop.duration_minutes || 60)
  }, [])

  const handleResize = useCallback((clientY: number) => {
    if (!resizingStop) return

    const deltaY = clientY - startY
    const minutesPerPixel = 2 // 2 minutes per pixel
    const newDuration = Math.max(15, startDuration + (deltaY * minutesPerPixel))
    const roundedDuration = Math.round(newDuration / 15) * 15 // Round to 15-minute intervals

    return roundedDuration
  }, [resizingStop, startY, startDuration])

  const endResize = useCallback((clientY: number) => {
    if (!resizingStop) return

    const finalDuration = handleResize(clientY)
    if (finalDuration !== undefined) {
      onUpdateDuration(resizingStop, finalDuration)
    }

    setResizingStop(null)
    setStartY(0)
    setStartDuration(0)
  }, [resizingStop, handleResize, onUpdateDuration])

  return {
    resizingStop,
    startResize,
    handleResize,
    endResize
  }
}