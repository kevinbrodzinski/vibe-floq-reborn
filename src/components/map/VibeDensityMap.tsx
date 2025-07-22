import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type MouseEvent,
} from "react";
import DeckGL from "@deck.gl/react";
import { MapView } from "@deck.gl/core";
import { X, LocateFixed, ZoomIn, ZoomOut } from "lucide-react";

import { zIndex } from "@/constants/z";
import { Button } from "@/components/ui/button";
import { ClusterLegend } from "./ClusterLegend";
import { createDensityLayer, usePulseLayer } from "./DeckLayers";
import { useClusters } from "@/hooks/useClusters";
import { useOptimizedGeolocation } from "@/hooks/useOptimizedGeolocation";
import { MapErrorBoundary } from "./MapErrorBoundary";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Coords {
  lat: number;
  lng: number;
}

interface VibeDensityMapProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional externally-supplied user location (e.g. from react-router loader) */
  userLocation?: Coords | null;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_LOCATION = {
  lat: 34.0522,
  lng: -118.2437,
  zoom: 11,
  pitch: 0,
  bearing: 0,
} as const;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const VibeDensityMap = ({
  isOpen,
  onClose,
  userLocation,
  className = "",
}: VibeDensityMapProps) => {
  /* ------------------------------------------------------------------
    User location 
   ------------------------------------------------------------------ */
  const fallbackUserLocation = useOptimizedGeolocation();
  const currentUserLocation = userLocation ?? fallbackUserLocation; // unified

  const hasFix =
    !!currentUserLocation?.lat &&
    !!currentUserLocation?.lng &&
    !(currentUserLocation.lat === 0 && currentUserLocation.lng === 0);

  /* ------------------------------------------------------------------
    Initial / persisted view-state 
   ------------------------------------------------------------------ */
  const initialViewState = useMemo(
    () => ({
      longitude: hasFix ? currentUserLocation.lng : DEFAULT_LOCATION.lng,
      latitude: hasFix ? currentUserLocation.lat : DEFAULT_LOCATION.lat,
      zoom: hasFix ? 14 : DEFAULT_LOCATION.zoom,
      pitch: DEFAULT_LOCATION.pitch,
      bearing: DEFAULT_LOCATION.bearing,
    }),
    [hasFix, currentUserLocation?.lat, currentUserLocation?.lng],
  );

  const [viewState, setViewState] = useState(initialViewState);
  const [hasCentered, setHasCentered] = useState(false);

  /* ------------------------------------------------------------------
    BBox → Cluster query 
   ------------------------------------------------------------------ */
  const bbox = useMemo(() => {
    const { longitude, latitude, zoom } = viewState;
    const scale = Math.pow(2, 15 - zoom);
    const latOffset = scale * 0.01;
    const lngOffset = (scale * 0.01) / Math.cos((latitude * Math.PI) / 180);
    return [
      longitude - lngOffset,
      latitude - latOffset,
      longitude + lngOffset,
      latitude + latOffset,
    ] as [number, number, number, number];
  }, [viewState]);

  const { clusters, loading, error, isRealTimeConnected } = useClusters(bbox, 6);

  /* ------------------------------------------------------------------
    Deck.gl layers 
   ------------------------------------------------------------------ */
  const vibePrefs = useMemo(() => ({}), []); // future: real prefs

  const handleClusterClick = useCallback(
    (c: any) => {
      /* TODO: show side-card etc. */
      console.log("cluster clicked", c);
    },
    [],
  );

  const pulseLayer = usePulseLayer(clusters, vibePrefs);

  const layers = useMemo(() => {
    if (!clusters?.length) return [];
    const densityLayer = createDensityLayer(clusters, vibePrefs, handleClusterClick);
    return [densityLayer, pulseLayer].filter(Boolean);
  }, [clusters, pulseLayer, handleClusterClick, vibePrefs]);

  /* ------------------------------------------------------------------
    Helpers 
   ------------------------------------------------------------------ */
  const centerOnUser = useCallback(() => {
    if (hasFix) {
      setViewState((prev) => ({
        ...prev,
        longitude: currentUserLocation.lng,
        latitude: currentUserLocation.lat,
        zoom: 14,
        transitionDuration: 1000,
        transitionEasing: (x: number) => 1 - Math.pow(1 - x, 3),
      }));
    }
  }, [hasFix, currentUserLocation.lng, currentUserLocation.lat]);

  // auto-center once
  useEffect(() => {
    if (!hasCentered && hasFix) {
      centerOnUser();
      setHasCentered(true);
    }
  }, [hasFix, hasCentered, centerOnUser]);

  // esc-to-close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  if (!isOpen) return null;

  return (
    <MapErrorBoundary>
      <div
        {...zIndex("modal")}
        role="dialog"
        aria-modal="true"
        className={`fixed inset-4 rounded-2xl border border-border bg-background shadow-2xl ${className}`}
      >
        {/* header */}
        <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-background/90 p-4 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-semibold">Vibe Field</h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Sensing the vibe…"
                : `${clusters.length} energy clusters detected`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRealTimeConnected && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                Live
              </span>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="Close map"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* map container */}
        <div className="absolute inset-0 pt-16">
          {/* loading / error overlays */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="animate-pulse text-sm text-muted-foreground">
                Tuning into the city's pulse…
              </span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="font-medium text-destructive">Signal lost</p>
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                Couldn't connect to the vibe network. Check your connection or
                try again.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reconnect
              </Button>
            </div>
          )}

          {/* deck.gl */}
          <DeckGL
            viewState={viewState}          // ✅ controlled prop
            controller={true}
            views={new MapView({ repeat: false })}
            layers={layers}
            onViewStateChange={({ viewState: vs }) => setViewState(vs as any)}
            style={{ width: "100%", height: "100%" }}
          />

          {/* floating controls */}
          <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="pointer-events-auto rounded-full shadow-lg"
              onClick={() =>
                setViewState((p) => ({ ...p, zoom: Math.min(p.zoom + 1, 20) }))
              }
            >
              <ZoomIn size={16} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="pointer-events-auto rounded-full shadow-lg"
              onClick={() =>
                setViewState((p) => ({ ...p, zoom: Math.max(p.zoom - 1, 1) }))
              }
            >
              <ZoomOut size={16} />
            </Button>
            {hasFix && (
              <Button
                size="icon"
                variant="secondary"
                className="pointer-events-auto rounded-full shadow-lg"
                onClick={centerOnUser}
              >
                <LocateFixed size={16} />
              </Button>
            )}
          </div>

          {/* legend */}
          {clusters.length > 0 && (
            <ClusterLegend
              clusters={clusters}
              className="absolute bottom-4 left-4"
            />
          )}

          {/* footer stats */}
          {clusters.length > 0 && (
            <footer className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-muted-foreground">
              {clusters.length} clusters •{" "}
              {clusters.reduce((s, c) => s + c.total, 0)} souls in the field
            </footer>
          )}
        </div>
      </div>
    </MapErrorBoundary>
  );
};