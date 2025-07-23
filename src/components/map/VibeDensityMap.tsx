import {
  useEffect,
  useMemo,
} from "react";
import DeckGL from "@deck.gl/react";
import { Map as MapboxMap } from "react-map-gl";        // ← new
import { createDensityLayer, usePulseLayer } from "./DeckLayers";
import { VibeFilterPanel } from "./VibeFilterPanel";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
         SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import { useClusters } from "@/hooks/useClusters";
import { useVibeFilter } from "@/hooks/useVibeFilter";
import { ClusterLegend } from "./ClusterLegend";
import { MapErrorBoundary } from "./MapErrorBoundary";
import type { Cluster } from "@/hooks/useClusters";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN!;   // already used elsewhere
const DENSITY_STYLE = 'mapbox://styles/flowvibes/floq-density-dark'; // 👈 after you upload

/* ———————————————————————————————————————————— */
interface VibeDensityMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  clusters?: Cluster[];          // optional pre-fetched
}

export function VibeDensityMap({
  open,
  onOpenChange,
  userLocation,
  clusters: propClusters,
}: VibeDensityMapProps) {
  /* 1 · Early-out if location unknown */
  if (!userLocation) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetPortal>
          <SheetOverlay className="bg-background/70 backdrop-blur-sm" />
          <SheetContent side="bottom" className="h-72 grid place-items-center">
            <p className="text-muted-foreground text-sm">
              🛰️ We couldn’t get your location.
            </p>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    );
  }

  /* 2 · Viewport + bbox */
  const initialViewState = useMemo(() => ({
    latitude:  userLocation.lat,
    longitude: userLocation.lng,
    zoom:      12,
    bearing:   0,
    pitch:     0,
  }), [userLocation.lat, userLocation.lng]);

  const bbox = useMemo(() => {
    const d = 0.015;                         // ≈ 1.5 km
    return [
      userLocation.lng - d,
      userLocation.lat - d,
      userLocation.lng + d,
      userLocation.lat + d,
    ] as [number, number, number, number];
  }, [userLocation]);

  /* 3 · Data */
  const { clusters: fetched = [], loading, error } = useClusters(bbox, 6);
  const clusters = propClusters?.length ? propClusters : fetched;

  /* 4 · Filters */
  const [filterState, filterHelpers] = useVibeFilter();
  const visible = useMemo(() => {
    if (!filterHelpers.isFiltered) return clusters;
    return clusters.filter(c =>
      Object.keys(c.vibe_counts).some(v =>
        filterHelpers.activeSet.has(v as any)));
  }, [clusters, filterHelpers]);

  /* 5 · Layers */
  const densityLayer = createDensityLayer(visible, {}, () => {});
  const pulseLayer   = usePulseLayer   (visible, {});
  const layers       = [densityLayer, pulseLayer].filter(Boolean);

  /* 6 · Modal - full-height top-sheet (pull-down=close on touch) */
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal>
      <SheetPortal>
        <SheetOverlay className="bg-background/60 backdrop-blur-sm" />

        <SheetContent
          side="top"
          dragDirection="vertical"            /* ← touch-friendly dismiss */
          dragThreshold={80}                 /* px before auto-close */
          onDragEnd={(d) => d.canceled || onOpenChange(false)}
          className="h-[92vh] max-h-[720px] mx-auto w-full max-w-screen-md
                     flex flex-col rounded-b-2xl shadow-xl
                     border-x border-border/40">
          {/* Header */}
          <SheetHeader className="px-6 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold">
                Vibe Density Map
              </SheetTitle>

              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  <span className="mr-1 block h-2 w-2 bg-green-500 rounded-full" />
                  LIVE
                </Badge>
                <VibeFilterPanel
                  value={filterState}
                  onChange={filterHelpers.replace}
                />
              </div>
            </div>
          </SheetHeader>

          {/* Map */}
          <div className="relative flex-1">
            {loading && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Loading clusters…
              </div>
            )}

            {!error && (
              <MapErrorBoundary>
                <DeckGL
                  initialViewState={initialViewState as any}
                  controller={false}              /* non-interactive */
                  layers={layers}
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <MapboxMap
                    reuseMaps
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle={DENSITY_STYLE}
                  />
                </DeckGL>
              </MapErrorBoundary>
            )}

            {error && (
              <div className="absolute inset-0 grid place-items-center text-sm text-destructive">
                Couldn’t load data
              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="px-6 py-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span>{visible.length} spots</span>
              <span aria-hidden>•</span>
              <span>
                {visible.reduce((s, c) => s + c.total, 0)} people
              </span>
              {filterHelpers.isFiltered && (
                <>
                  <span aria-hidden>•</span>
                  <span>
                    {filterHelpers.hiddenCount} vibes off
                  </span>
                </>
              )}
            </div>
            <ClusterLegend clusters={visible} className="mt-2" />
          </SheetFooter>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}