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
    >
      <Plus className="h-4 w-4" />
    </button>
    <button
      onClick={() => setZoom(Math.max(zoom / 1.25, 0.5))}
      className="rounded-lg border border-border/20 p-2 backdrop-blur-sm bg-background/50 hover:bg-background/70 transition-colors"
      aria-label="Zoom out"
    >
      <Minus className="h-4 w-4" />
    </button>
  </div>
);