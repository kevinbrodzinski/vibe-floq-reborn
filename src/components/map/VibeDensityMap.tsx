
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
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { createDensityLayer, usePulseLayer } from "./DeckLayers";
import { VibeFilterPanel } from "./VibeFilterPanel";
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

  const [viewState, setViewState] = useState({
    ...INITIAL_VIEW,
    ...(hasFix && { latitude: loc!.lat, longitude: loc!.lng, zoom: 13 }),
  });

  /* ───────────────────────── derive BBox & fetch ──────────────────── */
  const bbox = useMemo<[number, number, number, number]>(() => {
    const { longitude, latitude, zoom } = viewState;
    const scale     = Math.pow(2, 15 - zoom);
    const latDelta  = scale * 0.01;
    const lngDelta  = (scale * 0.01) / Math.cos(latitude * Math.PI / 180);
    return [
      longitude - lngDelta,
      latitude  - latDelta,
      longitude + lngDelta,
      latitude  + latDelta,
    ];
  }, [viewState]);

  const { clusters, loading, error, isRealTimeConnected } = useClusters(bbox, 6);

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
    ({ viewState: newViewState }: { viewState: any }) => {
      setViewState(newViewState);
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

      {/* header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border">
            Emotional Density Map
          </h2>
          
          {/* live indicator */}
          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full border text-xs">
            {isRealTimeConnected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-muted-foreground">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Offline</span>
              </>
            )}
          </div>
        </div>

        {/* close button */}
        {onRequestClose && (
          <button
            onClick={onRequestClose}
            className="rounded-full bg-background/90 backdrop-blur-sm p-2 border transition hover:bg-background"
            aria-label="Close map"
          >
            ✕
          </button>
        )}
      </div>

      {/* filter panel */}
      <div className="absolute top-20 left-4">
        <VibeFilterPanel
          value={filterState}
          onChange={helpers.replace}
        />
      </div>

      {/* loading indicator */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading vibes...</span>
        </div>
      )}

      {/* error state */}
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-destructive/90 backdrop-blur-sm text-destructive-foreground px-4 py-2 rounded-lg border">
          <p className="text-sm">Failed to load vibes: {error}</p>
        </div>
      )}

      <DeckGL
        viewState={viewState}
        layers={layers}
        controller={true}
        onViewStateChange={updateViewState}
        style={{ width: "100%", height: "100%", position: "relative" }}
      />

      {/* empty-state */}
      {!loading && !error && visibleClusters.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border">
            No vibes detected in this area yet.
          </p>
        </div>
      )}

      {/* footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 select-none text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full border">
        {visibleClusters.length} clusters •{" "}
        {visibleClusters.reduce((s, c) => s + c.total, 0)} souls
        {hiddenCount > 0 && (
          <>
            {" "}
            • {hiddenCount} vibe{hiddenCount > 1 && "s"} off
          </>
        )}
      </div>
    </div>
  );
};
