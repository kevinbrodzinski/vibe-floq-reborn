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

import { FriendDrawerProvider } from "@/contexts/FriendDrawerContext";
import { FriendDrawer } from "@/components/field/FriendDrawer";
import { TimewarpDrawerProvider } from "@/contexts/TimewarpDrawerContext";
import { TimewarpDrawer } from "@/components/field/TimewarpDrawer";
import { LayerSelectionFab } from "@/components/field/LayerSelectionFab";
import { ProximityNotifications } from "@/components/location/ProximityNotifications";
import { useEnhancedFriendDistances } from "@/hooks/useEnhancedFriendDistances";
import { useDebugLocationToast } from "@/components/debug/useDebugLocationToast";
import { LensSwitcher } from "@/components/field/LensSwitcher";
import { LensStatusHUD } from "@/components/field/LensStatusHUD";
import { LensHotkeys } from "@/components/field/LensHotkeys";
// import { AutoDiscoveryManager } from "@/components/field/AutoDiscoveryManager"; // Disabled for now

interface FieldLayoutProps {
}

export const FieldLayout = () => {
  const data = useFieldData();
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

  // Debug logging for enhanced location tracking state
  console.log('[FieldLayout] Enhanced location tracking state:', {
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
    console.log('Ripple at:', x, y);
  };

  // Debug location handler
  const handleDebugLocation = () => {
    console.log('[FieldLayout] Setting debug location and reloading...');
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
  console.log('[FieldLayout] Location gate state:', {
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
                console.log('[FieldLayout] Permission denied - trying again');
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
                console.log('[FieldLayout] User requested location');
                // Trigger both geo and location context to ensure proper permission flow
                Promise.all([
                  geo.requestLocation ? Promise.resolve(geo.requestLocation()) : Promise.resolve(),
                  location?.startTracking && typeof location.startTracking === 'function' 
                    ? Promise.resolve(location.startTracking()) 
                    : Promise.resolve()
                ]).catch(err => {
                  console.warn('[FieldLayout] Location request failed:', err);
                  // Fallback to direct geolocation API
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      console.log('[FieldLayout] Fallback geolocation success');
                      // Force a refresh to pick up the new location
                      window.location.reload();
                    },
                    (e) => console.warn('[FieldLayout] Fallback geolocation error', e),
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

          {/* Bottom HUD - Friends and Timewarp drawers - z-60 */}
          <BottomHud>
            <FriendDrawer />
            <TimewarpDrawer />
          </BottomHud>

          {/* Layer Selection FAB - consolidated controls - z-65 */}
          <LayerSelectionFab />

          {/* Proximity Notifications - z-50 */}
          <ProximityNotifications />

          {/* Auto-Discovery Manager - disabled for now to prevent errors */}
          {/* <AutoDiscoveryManager /> */}

          {/* System Layer (FAB, accessibility) - z-70+ */}
          <FieldSystemLayer data={data} />

          {/* Lens System - z-600 */}
          <LensHotkeys />
          {/* Centered, immune to clipping */}
          <div
            className="fixed z-[600] pointer-events-none"
            style={{
              top: `calc(16px + env(safe-area-inset-top, 0px))`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(680px, calc(100vw - 32px))',
            }}
          >
            <div className="pointer-events-auto w-full flex justify-center">
              <LensSwitcher />
            </div>
          </div>
          <div className="fixed top-4 left-4 z-[560] pointer-events-none">
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
        </TimewarpDrawerProvider>
      </FriendDrawerProvider>
    </ErrorBoundary>
  );
};