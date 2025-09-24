import { Rewind } from 'lucide-react';
import { useTimewarpDrawer } from '@/contexts/TimewarpDrawerContext';

export const TimewarpFab = () => {
  const { open, toggle } = useTimewarpDrawer();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle timewarp playback"
      aria-controls="timewarp-drawer"
      aria-expanded={open}
      className="
        fixed top-[88px] right-4 z-[65] h-11 w-11
        rounded-full bg-background/90 backdrop-blur
        flex items-center justify-center shadow-lg
        border border-border hover:bg-muted/50 transition-colors
        hover:scale-105 active:scale-95
      "
    >
      <Rewind className="h-5 w-5" />
    </button>
  );
};