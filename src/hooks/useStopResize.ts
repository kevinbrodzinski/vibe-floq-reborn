import { useState, useCallback } from 'react'
import { debounce } from 'lodash-es'

interface UseStopResizeProps {
  onUpdateDuration: (stopId: string, durationMinutes: number) => void
}

export function useStopResize({ onUpdateDuration }: UseStopResizeProps) {
  const [resizingStop, setResizingStop] = useState<string | null>(null)
  const [startY, setStartY] = useState(0)
  const [startDurationMinutes, setStartDurationMinutes] = useState(0)

  const startResize = useCallback((stopId: string, stop: any, clientY: number) => {
    setResizingStop(stopId)
    setStartY(clientY)
    setStartDurationMinutes(stop.duration_minutes || 60)
  }, [])

  const handleResize = useCallback(
    debounce((clientY: number) => {
      if (!resizingStop) return

      const deltaY = clientY - startY
      const minutesPerPixel = 2 // 2 minutes per pixel
      const newDurationMinutes = Math.max(15, startDurationMinutes + (deltaY * minutesPerPixel))
      const roundedDurationMinutes = Math.round(newDurationMinutes / 15) * 15 // Round to 15-minute intervals

      return roundedDurationMinutes
    }, 16), // ~60fps debouncing
    [resizingStop, startY, startDurationMinutes]
  )

  const endResize = useCallback((clientY: number) => {
    if (!resizingStop) return

    const finalDurationMinutes = handleResize(clientY)
    if (finalDurationMinutes !== undefined) {
      onUpdateDuration(resizingStop, finalDurationMinutes)
    }

    setResizingStop(null)
    setStartY(0)
    setStartDurationMinutes(0)
  }, [resizingStop, handleResize, onUpdateDuration])

  return {
    resizingStop,
    startResize,
    handleResize,
    endResize
  }
}