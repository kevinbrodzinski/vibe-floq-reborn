import React, { Suspense, useCallback, useMemo } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GeolocationPrompt } from "@/components/ui/geolocation-prompt";
import { MotionPermissionBanner } from "@/components/ui/MotionPermissionBanner";

import { LayersRuntime } from "./LayersRuntime";
import { FieldMapLayer } from "./FieldMapLayer";
import { FieldUILayer } from "./FieldUILayer";
import { FieldModalLayer } from "./FieldModalLayer";
import { FieldSystemLayer } from "./FieldSystemLayer";
import { TileDebugVisual } from "@/components/field/TileDebugVisual";
import { useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { useFieldGestures } from "@/hooks/useFieldGestures";
import { useRef } from "react";
import { useFieldData } from "./FieldDataProvider";
import { BottomHud } from "@/components/layout/BottomHud";
import type { LocationError } from "@/types/overrides";
import { useGeo } from "@/hooks/useGeo";
import { FlowMetricsProvider } from "@/contexts/FlowMetricsContext";
import { useLayerManager } from "@/hooks/useLayerManager";
import { getCurrentMap } from "@/lib/geo/mapSingleton";
import { LayerSelectionFab } from "@/components/field/LayerSelectionFab";
import { ProximityNotifications } from "@/components/location/ProximityNotifications";
// Flow-first spatial UI
import { FlowRouteMapLayer } from "@/components/map/FlowRouteMapLayer";
import { FlowRetraceHUD } from "@/components/flow/FlowRetraceHUD";
import { FriendDrawerProvider } from "@/contexts/FriendDrawerContext";
import { FriendDrawer } from "@/components/field/FriendDrawer";
import { TimewarpDrawerProvider } from "@/contexts/TimewarpDrawerContext";
import { TimewarpDrawer } from "@/components/field/TimewarpDrawer";
import { useEnhancedFriendDistances } from "@/hooks/useEnhancedFriendDistances";
import { useDebugLocationToast } from "@/components/debug/useDebugLocationToast";
import { LensSwitcher } from "@/components/field/LensSwitcher";
import { LensStatusHUD } from "@/components/field/LensStatusHUD";
import { LensHotkeys } from "@/components/field/LensHotkeys";
import TopBarStack from "@/components/field/top/TopBarStack";
// NEW
import { ExploreDrawerProvider } from "@/contexts/ExploreDrawerContext";
import { RallyInboxUIProvider } from '@/contexts/RallyInboxUIContext';
import { RallyNavBridge } from '@/components/rally/RallyNavBridge';
import { RallyInboxHost } from '@/components/rally/RallyInboxHost';
import { MapNavBridge } from '@/components/nav/MapNavBridge';
import { InboxNavBridge } from '@/components/nav/InboxNavBridge';
import { DirectionsBridge } from '@/components/nav/DirectionsBridge';
import { ConvergenceNotificationSystem } from '@/components/convergence/ConvergenceNotificationSystem';
import { useConvergenceMonitor } from '@/hooks/useConvergenceMonitor';
import { FlowAndVenueBridge } from '@/components/system/FlowAndVenueBridge';
import { mountAnalytics } from '@/lib/analytics/bridge';
import { useVibeEngine } from "@/hooks/useVibeEngine";
import { VibeDebugPanel } from "@/components/vibe/VibeDebugPanel";
// Dev QA harness
import '@/dev/emit';
import '@/dev/vibeQA';
// import { AutoDiscoveryManager } from "@/components/field/AutoDiscoveryManager"; // Disabled for now
import { IntelligenceWidgets } from './IntelligenceWidgets';
import { useFlowFilters } from '@/hooks/useFlowFilters';
import { useSunOpportunity } from '@/hooks/useSunOpportunity';
import { useFlowExplore } from '@/hooks/useFlowExplore';
import { FlowExploreChips } from '@/components/flow/FlowExploreChips';
import { FlowErrorBoundary } from '@/components/flow/FlowErrorBoundary';
import { useFieldLens } from '@/components/field/FieldLensProvider';
import { USE_TOPBAR_STACK } from '@/features/field/config';
import { TemporalController } from '@/components/Temporal/TemporalController';

interface FieldLayoutProps {
}

export const FieldLayout = () => {
  // Vibe Engine: starts 60s loop (on-device, no perms required)
  useVibeEngine(true);

  // Analytics mounting with cleanup
  React.useEffect(() => {
    const off = mountAnalytics();
    return off;
  }, []);
  
  const data = useFieldData();
  const { lens } = useFieldLens();
  const map = getCurrentMap();
  
  // Flow filters for TopBarStack integration
  const { filters, setFilters, loaded: filtersLoaded } = useFlowFilters();
  const sunEnabled = filters.weatherPref?.[0] === 'sun';
  const { score: sunScore } = useSunOpportunity(lens === 'explore' && sunEnabled);
  const [lastMs, setLastMs] = React.useState<number|undefined>();
  const { clusterRes, loading } = useFlowExplore({ 
    lens, 
    map, 
    filters, 
    onLatencyMs: setLastMs 
  });
  const { 
    location, 
    isLocationReady, 
    enhancedLocation,
    hasActiveGeofences,
    hasNearbyUsers,
    currentVenueConfidence,
    isLocationHidden 
  } = useFieldLocation();
  const { setVenuesSheetOpen } = useFieldUI();
  const { people } = useFieldSocial();
  
  // Use useGeo for location gate logic (more reliable than unified location context)
  const geo = useGeo();
  
  // Enhanced friend distance system status
  const enhancedFriends = useEnhancedFriendDistances({
    maxDistance: 5000,
    enableProximityTracking: true,
    enablePrivacyFiltering: true,
    sortBy: 'distance'
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureHandlers = useFieldGestures(canvasRef);

  // Debug location toast for dev mode
  useDebugLocationToast();

  // Initialize convergence monitoring system
  useConvergenceMonitor();

  // Debug logging for enhanced location tracking state
  if (import.meta.env.DEV) console.log('[FieldLayout] Enhanced location tracking state:', {
    isLocationReady,
    hasLocation: !!location,
    locationValue: location,
    enhancedLocation: {
      isTracking: enhancedLocation.isTracking,
      privacyLevel: enhancedLocation.privacyLevel,
      currentVenue: enhancedLocation.currentVenue?.venueId,
      nearbyUsersCount: enhancedLocation.nearbyUsers.length,
      geofenceCount: enhancedLocation.geofenceMatches.length,
      lastUpdate: enhancedLocation.lastUpdate
    }
  });

  // Get shake detection functions for motion permission banner
  const { requestMotionPermission, isMotionAvailable } = useShakeDetection({
    enabled: false, // Just for permission access, not actual detection
    onShake: () => { },
    onLongPress: () => { },
    onMultiTouch: () => { }
  });

  // Handle ripple effect for canvas clicks
  const handleRipple = (x: number, y: number) => {
    // TODO: Implement ripple visual effect
    if (import.meta.env.DEV) console.log('Ripple at:', x, y);
  };

  // Debug location handler
  const handleDebugLocation = () => {
    if (import.meta.env.DEV) console.log('[FieldLayout] Setting debug location and reloading...');
    localStorage.setItem('floq-debug-forceLoc', '37.7749,-122.4194'); // SF coords
    sessionStorage.removeItem('floq-coords');
    window.location.reload();
  };

  // ---- helper flags with improved logic using useGeo for gate ---------------------------------------------
  const hasCoords = !!geo.coords;
  const geoReady = geo.isLocationReady && hasCoords;
  const geoLoading = ['idle', 'loading', 'fetching'].includes(geo.status);
  const deniedList = ['denied','permission_denied'];
  const geoError = geo.error && !['unavailable','timeout'].includes(geo.error) && !deniedList.includes(geo.error);
  
  // 🔧 REQUIRE LOCATION FOR MAP - Allow dev fallback so developers can see UI without GPS
  const allowMapWithFallback = import.meta.env.DEV;
  const shouldShowMap = geoReady || allowMapWithFallback;
  
  // Enhanced debugging with both geo and location context state
  if (import.meta.env.DEV) console.log('[FieldLayout] Location gate state:', {
    geoReady,
    geoLoading,
    geoError,
    hasCoords,
    geoStatus: geo.status,
    geoCoords: geo.coords,
    geoIsLocationReady: geo.isLocationReady,
    unifiedLocationReady: isLocationReady,
    unifiedLocationStatus: location?.status,
    unifiedLocationCoords: location?.coords
  });

  // ---- UI --------------------------------------------------------
  // Only show prompt if there's a permission error or persistent failure
  if (geoError && geo.error === 'denied') {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt
              onRequestLocation={() => {
                if (import.meta.env.DEV) console.log('[FieldLayout] Permission denied - trying again');
                geo.requestLocation?.();
                location?.startTracking?.();
              }}
              error="denied"
              loading={false}
              onSetDebugLocation={handleDebugLocation}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show loading prompt while initializing or if still no location after reasonable time
  // 🔧 MODIFIED: Only block UI if strict mode AND no fallback permission
  if (!shouldShowMap && !geoReady) {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt
              onRequestLocation={() => {
                if (import.meta.env.DEV) console.log('[FieldLayout] User requested location');
                // Trigger both geo and location context to ensure proper permission flow
                Promise.all([
                  geo.requestLocation ? Promise.resolve(geo.requestLocation()) : Promise.resolve(),
                  location?.startTracking && typeof location.startTracking === 'function' 
                    ? Promise.resolve(location.startTracking()) 
                    : Promise.resolve()
                ]).catch(err => {
                  if (import.meta.env.DEV) console.warn('[FieldLayout] Location request failed:', err);
                  // Fallback to direct geolocation API
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      if (import.meta.env.DEV) console.log('[FieldLayout] Fallback geolocation success');
                      // Force a refresh to pick up the new location
                      window.location.reload();
                    },
                    (e) => { if (import.meta.env.DEV) console.warn('[FieldLayout] Fallback geolocation error', e) },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                });
              }}
              error={geo.error || null}
              loading={geoLoading}
              onSetDebugLocation={handleDebugLocation}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <FriendDrawerProvider>
        <TimewarpDrawerProvider>
          <FlowMetricsProvider map={getCurrentMap()}>
            {/* NEW: global provider for Explore Drawer visibility */}
            <ExploreDrawerProvider>
              <RallyInboxUIProvider>
                {/* Global bridges */}
                <FlowAndVenueBridge />
                <MapNavBridge />
                <InboxNavBridge />
                <RallyNavBridge />
                <RallyInboxHost />
                
                {/* Convergence notifications */}
                <ConvergenceNotificationSystem />
                <VibeDebugPanel open={false} />
              <div className="relative h-svh w-full">
                {/* Motion Permission Banner - Global Level */}
                <MotionPermissionBanner
                  requestMotionPermission={requestMotionPermission}
                  isMotionAvailable={isMotionAvailable}
                />

                {/* Base Map Layer - z-0 */}
                <div {...gestureHandlers}>
                  <FieldMapLayer
                    data={data}
                    people={people}
                    floqs={data.floqEvents}
                    onRipple={handleRipple}
                    canvasRef={canvasRef}
                  />
                </div>

                {/* UI Content Layer - z-10 to z-30 */}
                <FieldUILayer />

                {/* Modal/Sheet Layer - z-40 to z-60 */}
                <FieldModalLayer data={data} />

                {/* Updated Layers Runtime with all overlays */}
                <LayersRuntime 
                  data={data}
                />

                {/* Flow route layers & lightweight UI */}
                <FlowRouteMapLayer />
                <FlowRetraceHUD />

                {/* Navigation Bridges */}
                <DirectionsBridge />

                {/* Bottom HUD - Friends and Timewarp drawers - z-60 */}
                <BottomHud>
                  <FriendDrawer />
                  <TimewarpDrawer />
                </BottomHud>
                
                {/* Intelligence Widgets - z-55 */}
                <IntelligenceWidgets 
                  location={location?.coords}
                  weather={data.weatherCells}
                  onViewIntelligenceDashboard={() => {
                    // Navigate to intelligence dashboard in dev mode
                    if (import.meta.env.DEV) {
                      console.log('Opening Intelligence Dashboard');
                      // For now, just log - could open in a modal or navigate
                    }
                  }}
                />

                {/* Layer Selection FAB - consolidated controls - z-65 */}
                <LayerSelectionFab />

                {/* Proximity Notifications - z-50 */}
                <ProximityNotifications />

          {/* System Layer (FAB, accessibility) - z-70+ */}
          <FieldSystemLayer data={data} />

          {/* Lens System - z-700 with TopBarStack */}
                <LensHotkeys />
                {USE_TOPBAR_STACK && (
                  <TopBarStack>
                    <div className="flex items-center justify-center">
                      <LensSwitcher inline />
                    </div>
                    {lens === 'explore' && filtersLoaded && (
                      <div className="flex items-center justify-center">
                        <FlowErrorBoundary>
                          <FlowExploreChips 
                            inline
                            value={filters} 
                            onChange={setFilters} 
                            clusterRes={clusterRes}
                            loading={loading}
                            sunScore={sunScore ?? undefined}
                          />
                        </FlowErrorBoundary>
                      </div>
                    )}
                    {lens === 'temporal' && (
                      <div className="flex items-center justify-center">
                        <TemporalController inline map={map} />
                      </div>
                    )}
                  </TopBarStack>
                )}
                
                {!USE_TOPBAR_STACK && (
                  <div className="fixed left-1/2 -translate-x-1/2 z-[700] top-[calc(env(safe-area-inset-top,0px)+16px)]">
                    <LensSwitcher />
                  </div>
                )}
                
                <div className="fixed left-4 z-[560] pointer-events-none top-after-topbar">
                  <LensStatusHUD />
                </div>

                {/* Debug Layer (development only) - z-200+ */}
                {/* Debug visuals disabled for production */}
                {false && (
                  <TileDebugVisual
                    fieldTiles={data.fieldTiles}
                    visible={data.showDebugVisuals}
                  />
                )}
              </div>
              </RallyInboxUIProvider>
            </ExploreDrawerProvider>
          </FlowMetricsProvider>
        </TimewarpDrawerProvider>
      </FriendDrawerProvider>
    </ErrorBoundary>
  );
};