import { useFullscreenMap } from '@/store/useFullscreenMap'
import { Maximize2, Minimize2 } from 'lucide-react'

export const FullscreenFab = () => {
  const { mode, toggleFull } = useFullscreenMap()
  return (
    <button
      aria-label="Toggle full-screen map"
      onClick={toggleFull}
      className="fixed bottom-24 right-4 z-40 rounded-full bg-background p-3 shadow-lg
                 ring-1 ring-border transition hover:scale-105 active:scale-95"
    >
      {mode === 'full' ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
    </button>
  )
}