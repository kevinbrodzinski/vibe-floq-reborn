import { Maximize2, Minimize2, List } from 'lucide-react';
import { useFullscreenMap } from '@/store/useFullscreenMap';
export const FullscreenFab = () => {
  const {
    mode,
    toggleFull,
    toggleList
  } = useFullscreenMap();
  const isFull = mode === 'full';
  const isList = mode === 'list';
  const NextIcon = isFull ? Minimize2 : Maximize2;
  return <>
      {/* main full-screen FAB */}
      <button aria-label={isFull ? 'Exit full-screen map' : 'Enter full-screen map'} onClick={toggleFull} className="fixed-fab bg-primary text-primary-foreground hover:bg-primary/90">
        <NextIcon className="h-5 w-5" />
      </button>

      {/* list-mode toggle (only visible in map or list) */}
      
    </>;
};