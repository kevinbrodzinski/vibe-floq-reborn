import { Maximize2, Minimize2, List } from 'lucide-react'
import { useFullscreenMap } from '@/store/useFullscreenMap'

export const FullscreenFab = () => {
  const { mode, toggleFull, toggleList } = useFullscreenMap()

  const isFull = mode === 'full'
  const isList = mode === 'list'
  const NextIcon = isFull ? Minimize2 : Maximize2

  return (
    <>
      {/* main full-screen FAB */}
      <button
        aria-label={isFull ? 'Exit full-screen map' : 'Enter full-screen map'}
        onClick={toggleFull}
        className="fixed-fab flex items-center justify-center rounded-full 
                   bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90"
      >
        <NextIcon className="h-5 w-5" />
      </button>

      {/* list-mode toggle (only visible in map or list) */}
      <button
        aria-label={isList ? 'Show map view' : 'Show list view'}
        onClick={toggleList}
        className="fixed right-4 z-[70] flex h-12 w-12 items-center
                   justify-center rounded-full bg-background/80 backdrop-blur
                   shadow-lg ring-1 ring-border transition hover:bg-background/60"
        style={{ bottom: `calc(var(--fab-bottom-gap) + 60px)` }}
      >
        <List className="h-5 w-5" />
      </button>
    </>
  )
}