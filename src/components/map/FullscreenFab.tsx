
import { Maximize2, Minimize2, List } from 'lucide-react'
import { useFullscreenMap } from '@/store/useFullscreenMap'
import { useLocation } from 'react-router-dom'

export const FullscreenFab = () => {
  const { mode, toggleFull, toggleList } = useFullscreenMap()
  const location = useLocation()

  const isFull = mode === 'full'
  const isList = mode === 'list'
  const NextIcon = isFull ? Minimize2 : Maximize2

  // Only show on field/map routes
  const isFieldRoute = location.pathname === '/' || location.pathname === '/field'
  if (!isFieldRoute) return null

  return (
    <>
      {/* main full-screen FAB */}
      <button
        aria-label={isFull ? 'Exit full-screen map' : 'Enter full-screen map'}
        onClick={() => {
          console.log('Fullscreen FAB clicked, current mode:', mode)
          toggleFull()
        }}
        className="fixed-fab bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <NextIcon className="h-5 w-5" />
      </button>

      {/* list-mode toggle (only visible in map or list) */}
      <button
        aria-label={isList ? 'Show map view' : 'Show list view'}
        onClick={() => {
          console.log('List toggle FAB clicked, current mode:', mode)
          toggleList()
        }}
        className="fixed-fab fixed-fab--secondary
                   bg-background/80 backdrop-blur ring-1 ring-border
                   hover:bg-background/60"
      >
        <List className="h-5 w-5" />
      </button>
    </>
  )
}
