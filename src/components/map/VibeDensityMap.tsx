// ─────────────────────────────────────────────────────────────
// src/components/map/VibeDensityMap.tsx
// ─────────────────────────────────────────────────────────────
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

import {
  VibeFilterPanel,
  defaultPrefs,
  type VibePrefs,
} from "./VibeFilterPanel";
import type { Cluster } from "@/hooks/useClusters";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface Coords {
  lat: number;
  lng: number;
}

interface VibeDensityMapProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation?: Coords | null;
  className?: string;
}

const DEFAULT_LOCATION = {
  lat: 34.0522,
  lng: -118.2437,
  zoom: 11,
  pitch: 0,
  bearing: 0,
} as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clampLat = (v: number) => Math.max(Math.min(v, 85), -85);
const clampLng = (v: number) => ((v + 180) % 360 + 360) % 360 - 180;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const VibeDensityMap = ({
  isOpen,
  onClose,
  userLocation,
  className = "",
}: VibeDensityMapProps) => {
  const fallbackUserLocation = useOptimizedGeolocation();
  const currentUserLocation = userLocation ?? fallbackUserLocation ?? null;

  const hasFix =
    !!currentUserLocation &&
    !(currentUserLocation.lat === 0 && currentUserLocation.lng === 0);

  /* initial view ----------------------------------------------------- */
  const initialViewState = useMemo(
    () => ({
      longitude: hasFix ? currentUserLocation!.lng : DEFAULT_LOCATION.lng,
      latitude: hasFix ? currentUserLocation!.lat : DEFAULT_LOCATION.lat,
      zoom: hasFix ? 14 : DEFAULT_LOCATION.zoom,
      pitch: DEFAULT_LOCATION.pitch,
      bearing: DEFAULT_LOCATION.bearing,
    }),
    [hasFix, currentUserLocation?.lat, currentUserLocation?.lng],
  );

  const [viewState, setViewState] = useState(initialViewState);
  const [hasCentered, setHasCentered] = useState(false);

  /* bbox ------------------------------------------------------------- */
  const bbox = useMemo(() => {
    const { longitude, latitude, zoom } = viewState;
    const scale = Math.pow(2, 15 - zoom);
    const latOffset = scale * 0.01;
    const lngOffset = (scale * 0.01) / Math.cos((latitude * Math.PI) / 180);

    return [
      clampLng(longitude - lngOffset),
      clampLat(latitude - latOffset),
      clampLng(longitude + lngOffset),
      clampLat(latitude + latOffset),
    ] as [number, number, number, number];
  }, [viewState]);

  const {
    clusters,
    loading,
    error,
    isRealTimeConnected,
  } = useClusters(bbox, 6);

  /* ──────────────────────────────  prefs / filter  */
  const [vibePrefs, setVibePrefs] = useState<VibePrefs>(defaultPrefs);

  /* ──────────────────────────────  deck.gl layers  */
  const handleClusterClick = useCallback((c: Cluster) => {
    /* TODO: open side-panel with cluster stats */
    console.log("cluster clicked", c);
  }, []);

  const pulseLayer = usePulseLayer(clusters, vibePrefs);

  const layers = useMemo(() => {
    if (!clusters.length) return [];
    return [
      createDensityLayer(clusters, vibePrefs, handleClusterClick),
      pulseLayer, // already memoised by react on referential equality
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, vibePrefs, handleClusterClick]);

  /* center helpers --------------------------------------------------- */
  const centerOnUser = useCallback(() => {
    if (hasFix) {
      setViewState((v) => ({
        ...v,
        longitude: currentUserLocation!.lng,
        latitude: currentUserLocation!.lat,
        zoom: 14,
        transitionDuration: 1000,
        transitionEasing: (x: number) => 1 - Math.pow(1 - x, 3),
      }));
    }
  }, [hasFix, currentUserLocation]);

  // auto center once
  useEffect(() => {
    if (!hasCentered && hasFix) {
      centerOnUser();
      setHasCentered(true);
    }
  }, [hasFix, hasCentered, centerOnUser]);

  // update if location changes later
  useEffect(() => {
    if (hasFix) {
      setViewState((v) => ({
        ...v,
        longitude: currentUserLocation!.lng,
        latitude: currentUserLocation!.lat,
      }));
    }
  }, [hasFix, currentUserLocation?.lng, currentUserLocation?.lat]);

  // escape-to-close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  /* lightweight pulse ticker ---------------------------------------- */
  const [, forceRender] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => forceRender((t) => t + 1));
    return () => cancelAnimationFrame(id);
  });

  /* render ----------------------------------------------------------- */
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
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-background/90 p-4 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-semibold">Vibe Field</h2>
            <p
              className="text-sm text-muted-foreground"
              aria-live="polite"
            >
              {loading
                ? "Sensing the vibe…"
                : `${clusters.length} energy clusters detected`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <VibeFilterPanel value={vibePrefs} onChange={setVibePrefs} />

            <Button
              size="icon"
              variant="ghost"
              aria-label="Close map"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* map container */}
        <div className="absolute inset-0 pt-16">
          {/* overlays */}
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
                {error}
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
            viewState={viewState}
            controller
            views={new MapView({ repeat: false })}
            layers={layers}
            onViewStateChange={({ viewState: vs }) =>
              setViewState(vs as any)
            }
            style={{ width: "100%", height: "100%" }}
          />

          {/* floating controls */}
          <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="pointer-events-auto rounded-full shadow-lg"
              onClick={() =>
                setViewState((p) => ({
                  ...p,
                  zoom: Math.min(p.zoom + 1, 20),
                }))
              }
            >
              <ZoomIn size={16} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="pointer-events-auto rounded-full shadow-lg"
              onClick={() =>
                setViewState((p) => ({
                  ...p,
                  zoom: Math.max(p.zoom - 1, 1),
                }))
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
              {isRealTimeConnected && (
                <span className="ml-1 text-green-500">• Live</span>
              )}
            </footer>
          )}
        </div>
      </div>
    </MapErrorBoundary>
  );
};