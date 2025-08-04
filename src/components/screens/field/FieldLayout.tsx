import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GeolocationPrompt } from "@/components/ui/geolocation-prompt";
import { MotionPermissionBanner } from "@/components/ui/MotionPermissionBanner";
import { FieldHeader } from "./FieldHeader";
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
import type { FieldData } from "./FieldDataProvider";
import { BottomHud } from "@/components/layout/BottomHud";

import { FriendDrawerProvider } from "@/contexts/FriendDrawerContext";
import { FriendFab } from "@/components/field/FriendFab";
import { FriendDrawer } from "@/components/field/FriendDrawer";
import { useEnhancedFriendDistances } from "@/hooks/useEnhancedFriendDistances";

interface FieldLayoutProps {
  data: FieldData;
}

export const FieldLayout = ({ data }: FieldLayoutProps) => {
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
  
  // Enhanced friend distance system status
  const enhancedFriends = useEnhancedFriendDistances({
    maxDistance: 5000,
    enableProximityTracking: true,
    enablePrivacyFiltering: true,
    sortBy: 'distance'
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureHandlers = useFieldGestures(canvasRef);

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
    // Set debug location in useGeo context
    console.log('[DEBUG] Setting dummy location - this should trigger location context');
    // Note: This will need to be handled by the field location context
  };

  // ---- helper flags ---------------------------------------------
  const geoReady = isLocationReady && location?.pos?.lat != null;
  const geoLoading = location?.loading || (!isLocationReady && !location?.error);
  const geoError = location?.error && location.error !== 'unavailable';

  // ---- UI --------------------------------------------------------
  // Only show prompt if there's a permission error or persistent failure
  if (geoError && location.error === 'denied') {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt
              onRequestLocation={() => location.startTracking()}
              error="denied"
              loading={false}
              onSetDebugLocation={handleDebugLocation}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show loading prompt while initializing or if unavailable signal
  if (!geoReady && (geoLoading || location?.error === 'unavailable')) {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt
              onRequestLocation={() => location.startTracking()}
              error={location?.error || null}
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
        <div className="relative h-svh w-full bg-background">
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
          <FieldUILayer data={data} />

          {/* Modal/Sheet Layer - z-40 to z-60 */}
          <FieldModalLayer data={data} />

          {/* Bottom HUD - Friends drawer - z-60 */}
          <BottomHud>
            <FriendDrawer />
          </BottomHud>

          {/* Friend FAB - z-65 */}
          <FriendFab />

          {/* System Layer (FAB, accessibility) - z-70+ */}
          <FieldSystemLayer data={data} />

          {/* Enhanced Location Status Indicators - z-80 (development only) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="fixed top-4 right-4 z-80 space-y-2">
              {/* Enhanced Location System Status */}
              {enhancedLocation.isTracking && (
                <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      enhancedLocation.error ? 'bg-red-400' : 
                      isLocationHidden ? 'bg-yellow-400' : 'bg-green-400'
                    }`}></div>
                    <div>
                      <div className="font-medium">Enhanced Location Active</div>
                      <div className="text-xs opacity-90">
                        Privacy: {enhancedLocation.privacyLevel} • 
                        {hasActiveGeofences && ` ${enhancedLocation.geofenceMatches.length} geofences`}
                        {enhancedLocation.currentVenue && ` • Venue: ${Math.round(currentVenueConfidence * 100)}%`}
                        {hasNearbyUsers && ` • ${enhancedLocation.nearbyUsers.filter(u => u.isNear).length} nearby`}
                      </div>
                      <div className="text-xs opacity-75">
                        Background Processing: Active • Last: {new Date(enhancedLocation.lastUpdate).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced Friend Distance Indicator */}
              {enhancedFriends.totalFriends > 0 && (
                <div className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg shadow-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div>
                      <div className="font-medium">Enhanced Friends: {enhancedFriends.totalFriends}</div>
                      <div className="text-xs opacity-90">
                        {enhancedFriends.nearbyCount} nearby • {enhancedFriends.highConfidenceFriends.length} high accuracy
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Proximity Events (last 3) */}
              {enhancedLocation.proximityEvents.length > 0 && (
                <div className="bg-accent text-accent-foreground px-3 py-2 rounded-lg shadow-lg text-sm max-w-xs">
                  <div className="font-medium mb-1">Recent Proximity Events</div>
                  {enhancedLocation.proximityEvents.slice(-3).map((event, i) => (
                    <div key={i} className="text-xs opacity-90 truncate">{event}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Debug Layer (development only) - z-200+ */}
          {/* Debug visuals disabled for production */}
          {false && (
            <TileDebugVisual
              fieldTiles={data.fieldTiles}
              visible={data.showDebugVisuals}
            />
          )}
        </div>
      </FriendDrawerProvider>
    </ErrorBoundary>
  );
};