import {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import DeckGL from "@deck.gl/react";
import { Badge } from "@/components/ui/badge";
import { MapErrorBoundary } from "./MapErrorBoundary";
import { ClusterLegend } from "./ClusterLegend";
import { VibeFilterPanel } from "./VibeFilterPanel";
import { createDensityLayer, usePulseLayer } from "./DeckLayers";
import { useClusters } from "@/hooks/useClusters";
import { useVibeFilter } from "@/hooks/useVibeFilter";
import type { Cluster } from "@/hooks/useClusters";
import { useEffect, useMemo } from "react";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiZmxvcXZpYmVzIiwiYSI6ImNtNHUwZmx4bzAzZGsya3M5eWZldHBrOTcifQ.VZWx-Bu3wP1iNSyK7bYIUg";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  clusters?: Cluster[];
}

export function VibeDensityMap({
  open,
  onOpenChange,
  userLocation,
  clusters: propClusters,
}: Props) {
  /* ––––– guards ––––––––––––––––––––––––––––––––––––––––––––––– */
  if (!userLocation) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetPortal>
          <SheetOverlay className="bg-background/60 backdrop-blur-sm" />
          <SheetContent side="bottom" className="h-96 max-w-[640px] mx-auto">
            <SheetHeader>
              <SheetTitle>No location</SheetTitle>
            </SheetHeader>
            <p className="h-full grid place-items-center text-muted-foreground">
              🛰️ Unable to determine your location.
            </p>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    );
  }

  /* ––––– data hooks ––––––––––––––––––––––––––––––––––––––––––– */
  const [prefs, filterHelpers] = useVibeFilter();

  const bbox = useMemo(() => {
    const o = 0.01;
    return [
      userLocation.lng - o,
      userLocation.lat - o,
      userLocation.lng + o,
      userLocation.lat + o,
    ] as [number, number, number, number];
  }, [userLocation]);

  const { clusters = [], loading, error } = useClusters(bbox, 6);
  const all = propClusters?.length ? propClusters : clusters;

  const visible = useMemo(() => {
    if (!filterHelpers.isFiltered) return all;
    return all.filter((c) =>
      Object.keys(c.vibe_counts).some((v) => filterHelpers.activeSet.has(v as any)),
    );
  }, [all, filterHelpers]);

  /* ––––– layers ––––––––––––––––––––––––––––––––––––––––––––––– */
  const density = createDensityLayer(visible, {}, () => {});
  const pulse = usePulseLayer(visible, {});
  const layers = [density, pulse].filter(Boolean);

  /* ––––– ESC close –––––––––––––––––––––––––––––––––––––––––––– */
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onOpenChange]);

  const totals = {
    people: visible.reduce((s, c) => s + c.total, 0),
    spots: visible.length,
  };

  const initialView = {
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    zoom: 12,
  } as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-background/60 backdrop-blur-sm" />

        {/* modal */}
        <SheetContent
          side="bottom"
          className="h-[85vh] max-w-[640px] mx-auto flex flex-col px-4 pb-0 pt-4"
        >
          {/* close */}
          <SheetClose
            className="absolute right-4 top-4 z-10 rounded-full p-2 hover:bg-accent/20 transition-colors"
            aria-label="Close"
          >
            <span aria-hidden>✕</span>
            <span className="sr-only">Close map</span>
          </SheetClose>

          {/* header */}
          <SheetHeader
            role="heading"
            aria-level={2}
            className="mb-3 flex items-center justify-between gap-3"
          >
            <div className="text-lg font-semibold">Vibe Density Map</div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                LIVE
              </Badge>
              <VibeFilterPanel
                value={prefs}
                onChange={filterHelpers.replace}
              />
            </div>
          </SheetHeader>

          {/* map area */}
          <div className="relative flex-1">
            {error ? (
              <div className="grid h-full place-items-center text-muted-foreground">
                Error loading clusters
              </div>
            ) : loading ? (
              <div className="grid h-full place-items-center text-muted-foreground">
                Loading…
              </div>
            ) : (
              <MapErrorBoundary>
                <div className="absolute inset-0">
                  {/* optional static image fallback */}
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url("https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${userLocation.lng},${userLocation.lat},12,0/600x400@2x?access_token=${MAPBOX_TOKEN}")`,
                    }}
                  />
                  <DeckGL
                    initialViewState={initialView as any}
                    controller
                    layers={layers}
                    style={{ position: "absolute", inset: "0" }}
                  />
                </div>
              </MapErrorBoundary>
            )}
          </div>

          {/* footer */}
          <SheetFooter className="min-h-[3.5rem] px-4 py-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span>{totals.spots} spots</span>
              <span aria-hidden>•</span>
              <span>{totals.people} people</span>
              {filterHelpers.isFiltered && (
                <>
                  <span aria-hidden>•</span>
                  <span>
                    {Object.keys(prefs).length - filterHelpers.activeSet.size}{" "}
                    vibes off
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