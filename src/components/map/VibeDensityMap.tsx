import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DeckGL from "@deck.gl/react";
import { FlyToInterpolator } from "@deck.gl/core";
import { createDensityLayer, usePulseLayer } from "./DeckLayers";
import { useVibeFilter } from "@/hooks/useVibeFilter";
import { useOptimizedGeolocation } from "@/hooks/useOptimizedGeolocation";
import { ALL_VIBES, DEFAULT_PREFS } from "@/utils/vibePrefs";
import { useClusters, type Cluster } from "@/hooks/useClusters";

const INITIAL_VIEW = {
  latitude: 34.0522,
  longitude: -118.2437,
  zoom: 11,
  minZoom: 2,
  maxZoom: 18,
  pitch: 0,
  bearing: 0,
  transitionDuration: 0,
  transitionInterpolator: null,
};

interface Props {
  onRequestClose?: () => void;
  /** Optional hint for initial centring */
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

export const VibeDensityMap: FC<Props> = ({
  onRequestClose,
  userLocation,
  className = "",
}) => {
  /* ───────────────────────── user / viewport ─────────────────────── */
  const fallbackLoc = useOptimizedGeolocation();
  const loc         = userLocation ?? fallbackLoc ?? null;
  const hasFix      = loc && isFinite(loc.lat) && isFinite(loc.lng);

  const viewStateRef = useRef({
    ...INITIAL_VIEW,
    ...(hasFix && { latitude: loc!.lat, longitude: loc!.lng, zoom: 13 }),
  });

  /* ───────────────────────── derive BBox & fetch ──────────────────── */
  const bbox = useMemo<[number, number, number, number]>(() => {
    const { longitude, latitude, zoom } = viewStateRef.current;
    const scale     = Math.pow(2, 15 - zoom);
    const latDelta  = scale * 0.01;
    const lngDelta  = (scale * 0.01) / Math.cos(latitude * Math.PI / 180);
    return [
      longitude - lngDelta,
      latitude  - latDelta,
      longitude + lngDelta,
      latitude  + latDelta,
    ];
  }, []); // recalculated manually on viewState change below

  const { clusters, loading, error } = useClusters(bbox, 6);

  /* ───────────────────────── prefs / filter ───────────────────────── */
  const [filterState, helpers] = useVibeFilter();
  const activeSet   = helpers.activeSet;
  const hiddenCount = ALL_VIBES.length - activeSet.size;
  const vibePrefs   = DEFAULT_PREFS;

  const visibleClusters = useMemo(
    () =>
      helpers.isFiltered
        ? clusters.filter((c) => {
            const vibe =
              (c as any).top_vibe ||
              (c.vibe_counts ? Object.keys(c.vibe_counts)[0] : "");
            return activeSet.has(vibe as any);
          })
        : clusters,
    [clusters, activeSet, helpers.isFiltered],
  );

  /* ───────────────────────── layers ──────────────────────────────── */
  const densityLayer = useMemo(
    () => createDensityLayer(visibleClusters, vibePrefs, () => {}),
    [visibleClusters, vibePrefs],
  );
  const pulseLayer = usePulseLayer(visibleClusters, vibePrefs);
  const layers     = useMemo(
    () => [densityLayer, pulseLayer].filter(Boolean),
    [densityLayer, pulseLayer],
  );

  /* ───────────────────────── handlers ────────────────────────────── */
  const updateViewState = useCallback(
    ({ viewState }: { viewState: any }) => {
      Object.assign(viewStateRef.current, viewState);
    },
    [],
  );

  /* ───────────────────────── render ──────────────────────────────── */
  return (
    <div
      className={`fixed inset-0 z-50 ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {/* scrim */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      <DeckGL
        viewState={viewStateRef.current}
        layers={layers}
        controller={true}
        onViewStateChange={updateViewState}
        style={{ width: "100%", height: "100%", position: "relative" }}
      />

      {/* empty-state */}
      {!loading && !error && visibleClusters.length === 0 && (
        <p className="absolute inset-0 m-auto h-fit w-full text-center text-sm text-muted-foreground">
          No vibes detected in this area yet.
        </p>
      )}

      {/* footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 select-none text-xs text-muted-foreground backdrop-blur-sm">
        {visibleClusters.length} clusters •{" "}
        {visibleClusters.reduce((s, c) => s + c.total, 0)} souls
        {hiddenCount > 0 && (
          <>
            {" "}
            • {hiddenCount} vibe{hiddenCount > 1 && "s"} off
          </>
        )}
      </div>

      {/* close */}
      {onRequestClose && (
        <button
          onClick={onRequestClose}
          className="absolute top-4 right-4 rounded-full bg-card/70 p-2 backdrop-blur-xl transition hover:bg-card"
          aria-label="Close map"
        >
          ✕
        </button>
      )}
    </div>
  );
};