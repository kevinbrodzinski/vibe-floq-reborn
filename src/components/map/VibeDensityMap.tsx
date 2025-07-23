import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type TouchEvent,
} from 'react';
import DeckGL from '@deck.gl/react';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetPortal, SheetOverlay, SheetContent,
  SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { VibeFilterPanel } from './VibeFilterPanel';
import { MapErrorBoundary } from './MapErrorBoundary';
import { ClusterLegend } from './ClusterLegend';
import { createDensityLayer, usePulseLayer } from './DeckLayers';
import { useClusters } from '@/hooks/useClusters';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import type { Cluster } from '@/hooks/useClusters';
import { ALL_VIBES } from '@/utils/vibePrefs';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiZmxvcXZpYmVzIiwiYSI6ImNtNHUwZmx4bzAzZGsya3M5eWZldHBrOTcifQ.VZWx-Bu3wP1iNSyK7bYIUg';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  clusters?: Cluster[];
}

/* ------------------------------------------------------------------ */

export function VibeDensityMap({
  open,
  onOpenChange,
  userLocation,
  clusters: preFetched,
}: Props) {
  /* ───────── guard ───────── */
  if (!userLocation)
    return (
      <BasicSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Vibe density map"
      >
        🛰️ Unable to determine your location.
      </BasicSheet>
    );

  /* ───────── location → viewport & bbox ───────── */
  const { lat, lng } = userLocation;
  const initialViewState = useMemo(
    () => ({ latitude: lat, longitude: lng, zoom: 12, pitch: 0, bearing: 0 }),
    [lat, lng],
  );
  const bbox = useMemo(() => {
    const d = 0.01;
    return [lng - d, lat - d, lng + d, lat + d] as [
      number,
      number,
      number,
      number,
    ];
  }, [lat, lng]);

  /* ───────── data ───────── */
  const {
    clusters: fetched = [],
    loading,
    error,
  } = useClusters(bbox, 6);
  const allClusters = preFetched?.length ? preFetched : fetched;

  /* ───────── vibe filter state ───────── */
  const [filter, helpers] = useVibeFilter();
  const visibleClusters = useMemo(() => {
    if (!helpers.isFiltered) return allClusters;
    return allClusters.filter((c) =>
      Object.keys(c.vibe_counts).some((v) =>
        helpers.activeSet.has(v as keyof typeof filter),
      ),
    );
  }, [allClusters, helpers.activeSet, helpers.isFiltered, filter]);

  /* ───────── deck.gl layers ───────── */
  const layers = useMemo(() => {
    const density = createDensityLayer(visibleClusters, {}, () => {});
    const pulse = usePulseLayer(visibleClusters, {});
    return [density, pulse].filter(Boolean);
  }, [visibleClusters]);

  /* ------------------------------------------------------------------ */
  /*                         bottom-sheet markup                         */
  /* ------------------------------------------------------------------ */

  /* drag-to-close (mobile) */
  const startY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const onTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) return; // ignore upward drag
    sheetRef.current!.style.transform = `translateY(${delta}px)`;
    if (delta > 64) onOpenChange(false);
  };
  const onTouchEnd = () => {
    startY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = '';
  };

  const totalPeople = visibleClusters.reduce((s, c) => s + c.total, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/50 backdrop-blur-sm" />

        {/* ↓ container has horizontal gutter & rounded top */}
        <SheetContent
          side="bottom"
          ref={sheetRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="h-[88vh] max-w-screen-md mx-auto
                     rounded-t-2xl px-4 pb-safe bg-background
                     flex flex-col shadow-2xl"
        >
          {/* header */}
          <SheetHeader className="relative z-[2]">
            <div className="flex items-center justify-between">
              <SheetTitle>Vibe Density Map</SheetTitle>

              {/* controls */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                  LIVE
                </Badge>

                {/* opens a *second* sheet that slides from right */}
                <VibeFilterPanel
                  value={filter}
                  onChange={helpers.replace}
                  asSheet
                />
              </div>
            </div>
          </SheetHeader>

          {/* map */}
          <div className="relative flex-1 mt-2 overflow-hidden rounded-xl">
            <MapErrorBoundary>
              <div
                className="absolute inset-0"
                style={{
                  background: `url("https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},12,0/600x400@2x?access_token=${MAPBOX_TOKEN}") center/cover`,
                }}
              />
              {!loading && (
                <DeckGL
                  initialViewState={initialViewState as any}
                  controller
                  layers={layers}
                  style={{ position: 'absolute', inset: '0' }}
                />
              )}
              {loading && (
                <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                  Loading clusters…
                </div>
              )}
            </MapErrorBoundary>
          </div>

          {/* footer */}
          <SheetFooter className="mt-3 text-xs text-muted-foreground flex justify-between items-center">
            <span>
              {visibleClusters.length} spots • {totalPeople} people
              {helpers.isFiltered && (
                <> • {ALL_VIBES.length - helpers.activeSet.size} vibes off</>
              )}
            </span>
            <ClusterLegend clusters={visibleClusters} />
          </SheetFooter>

          {/* close btn sits *outside* header, fixed top-right */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 h-9 w-9 rounded-full
                       bg-card/70 backdrop-blur-md shadow
                       hover:bg-card transition-colors flex items-center
                       justify-center text-xl"
            aria-label="Close density map"
          >
            ×
          </button>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*   fallback sheet (location error / cluster error) – tiny helper    */
/* ------------------------------------------------------------------ */

function BasicSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/50 backdrop-blur-sm" />
        <SheetContent
          side="bottom"
          className="h-60 max-w-screen-sm mx-auto rounded-t-2xl
                     px-6 py-6 bg-background flex flex-col gap-4"
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 grid place-items-center text-muted-foreground text-center">
            {children}
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}