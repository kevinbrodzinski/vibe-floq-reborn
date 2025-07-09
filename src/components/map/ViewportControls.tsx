import { MapPin, Plus, Minus, Target } from "lucide-react";
import type { MapViewportControls } from "@/hooks/useMapViewport";

interface ViewportControlsProps {
  controls: MapViewportControls;
}

export const ViewportControls = ({ controls }: ViewportControlsProps) => {
  const { viewport, zoomIn, zoomOut, centerOnUser } = controls;

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2 z-10">
      {/* Zoom Controls */}
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          disabled={viewport.zoom >= 10}
          className="w-8 h-8 flex items-center justify-center rounded border border-border/50 bg-background/50 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          title="Zoom In"
          aria-label="Zoom in to see more detail"
          type="button"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={zoomOut}
          disabled={viewport.zoom <= 1}
          className="w-8 h-8 flex items-center justify-center rounded border border-border/50 bg-background/50 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          title="Zoom Out"
          aria-label="Zoom out to see wider area"
          type="button"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Center on User */}
      <button
        onClick={centerOnUser}
        className="w-8 h-8 flex items-center justify-center rounded bg-card/90 backdrop-blur-sm border border-border hover:bg-accent/20 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        title="Center on My Location"
        aria-label="Center map on your current location"
        type="button"
      >
        <Target className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Zoom Level Indicator */}
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs text-muted-foreground text-center">
        {viewport.zoom.toFixed(1)}x
      </div>
    </div>
  );
};