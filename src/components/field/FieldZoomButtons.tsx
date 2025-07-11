import { Plus, Minus } from 'lucide-react';

interface Props {
  zoom: number;
  setZoom: (z: number) => void;
}

export const FieldZoomButtons = ({ zoom, setZoom }: Props) => (
  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
    <button
      onClick={() => setZoom(Math.min(zoom * 1.25, 4))}
      className="rounded-lg border border-border/20 p-2 backdrop-blur-sm bg-background/50 hover:bg-background/70 transition-colors"
      aria-label="Zoom in"
      disabled={zoom >= 4}
    >
      <Plus className="h-4 w-4 pointer-events-none" />
    </button>
    <button
      onClick={() => setZoom(Math.max(zoom / 1.25, 0.5))}
      className="rounded-lg border border-border/20 p-2 backdrop-blur-sm bg-background/50 hover:bg-background/70 transition-colors"
      aria-label="Zoom out"
      disabled={zoom <= 0.5}
    >
      <Minus className="h-4 w-4 pointer-events-none" />
    </button>
  </div>
);