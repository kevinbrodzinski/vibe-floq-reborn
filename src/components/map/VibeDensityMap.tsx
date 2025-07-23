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
import { easeCubic } from "d3-ease";
import { LngLat } from "mapbox-gl";
import { createDensityLayer, usePulseLayer } from "./DeckLayers";
import { useVibeFilter } from "@/hooks/useVibeFilter";
import { useOptimizedGeolocation } from "@/hooks/useOptimizedGeolocation";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useMapViewport } from "@/hooks/useMapViewport";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useCrossedPathsToday } from "@/hooks/useCrossedPathsToday";
import { useFaviconBadge } from "@/hooks/useFaviconBadge";
import { useFieldHitTest } from "@/hooks/useFieldHitTest";
import { useFieldGestures } from "@/hooks/useFieldGestures";
import { useEnvironmentDebug } from "@/hooks/useEnvironmentDebug";
import { useFloqActivity } from "@/hooks/useFloqActivity";
import { useToast } from "@/hooks/use-toast";
import { ALL_VIBES, DEFAULT_PREFS } from "@/utils/vibePrefs";
import type { Cluster } from "@/hooks/useClusters";

interface VibeDensityMapProps {
  onRequestClose?: () => void;
  userLocation?: { lat: number; lng: number } | null;
  clusters?: Cluster[];
  className?: string;
}

export const VibeDensityMap: FC<VibeDensityMapProps> = ({
  onRequestClose,
  userLocation,
  clusters = [],
  className = "",
}: VibeDensityMapProps) => {
  const fallbackUserLocation = useOptimizedGeolocation();
  
  // memoize to avoid recreation on every render
  const currentUserLocation = useMemo(
    () => userLocation ?? fallbackUserLocation ?? null,
    [userLocation, fallbackUserLocation]
  );

  const hasFix =
    !!currentUserLocation &&
    Number.isFinite(currentUserLocation.lat) &&
    Number.isFinite(currentUserLocation.lng);

  /* ──────────────────────────────  UI state  */
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  /* ──────────────────────────────  realtime connection  */
  const { settings } = useUserSettings();
  const { isDebugPanelOpen } = useEnvironmentDebug();

  /* ──────────────────────────────  positioning  */
  const viewStateRef = useRef({
    latitude: 34.0205,
    longitude: -118.4818,
    zoom: 12,
    minZoom: 2,
    maxZoom: 18,
    pitch: 0,
    bearing: 0,
    transitionDuration: 0,
    transitionInterpolator: null,
  });

  // Simple viewport handling
  const viewport = [viewStateRef.current.longitude, viewStateRef.current.latitude] as [number, number];

  /* ──────────────────────────────  prefs / filter  */
  const [filterState, filterHelpers] = useVibeFilter();
  
  // extract these once per render to avoid recreation
  const { activeSet } = filterHelpers;
  const hiddenCount = ALL_VIBES.length - activeSet.size;

  // use single source of truth for prefs
  const vibePrefs = DEFAULT_PREFS;

  /* ──────────────────────────────  deck.gl layers  */
  const handleClusterClick = useCallback((c: Cluster) => {
    setSelectedCluster(c);
    setIsDetailOpen(true);
    
    // Center map on clicked cluster
    if (c.centroid?.coordinates) {
      const [lng, lat] = c.centroid.coordinates;
      if (viewStateRef.current) {
        viewStateRef.current = {
          ...viewStateRef.current,
          longitude: lng,
          latitude: lat,
          zoom: Math.max(viewStateRef.current.zoom, 12),
          transitionDuration: 1000,
          transitionInterpolator: new FlyToInterpolator(),
        };
      }
    }
  }, []);

  const visibleClusters = useMemo(
    () => (filterHelpers.isFiltered 
      ? clusters.filter(c => activeSet.has(c.vibe_counts ? Object.keys(c.vibe_counts)[0] as any : ''))
      : clusters),
    [clusters, activeSet, filterHelpers.isFiltered],
  );

  // NEW – call hook directly (it no longer causes React renders)
  const pulseLayer = usePulseLayer(visibleClusters, vibePrefs);

  const densityLayer = useMemo(
    () => createDensityLayer(visibleClusters, vibePrefs, handleClusterClick),
    [visibleClusters, vibePrefs, handleClusterClick],
  );

  const layers = useMemo(
    () => [densityLayer, pulseLayer].filter(Boolean),
    [densityLayer, pulseLayer],
  );

  /* center helpers --------------------------------------------------- */
  const centerOnUser = useCallback(() => {
    if (!hasFix) return;
    const currentLoc = currentUserLocation;
    if (!currentLoc) return;

    viewStateRef.current = {
      ...viewStateRef.current,
      longitude: currentLoc.lng,
      latitude: currentLoc.lat,
      zoom: 14,
      transitionDuration: 1500,
      transitionInterpolator: new FlyToInterpolator(),
    };
  }, [hasFix, currentUserLocation]);

  /* ──────────────────────────────  effects  */
  const { count: crossedPathsCount } = useCrossedPathsToday();
  useFaviconBadge(crossedPathsCount);

  // Event banner
  const { toast } = useToast();
  const { data: currentEvent } = useCurrentEvent(
    currentUserLocation?.lat,
    currentUserLocation?.lng,
    () => {
      toast({
        title: `You're at ${currentEvent?.name}!`,
        description: `Join the ${currentEvent?.vibe} vibe.`,
      });
    }
  );

  // Auto-center on user when location known
  useEffect(() => {
    if (hasFix) {
      centerOnUser();
    }
  }, [hasFix, centerOnUser]);

  return null;
};
