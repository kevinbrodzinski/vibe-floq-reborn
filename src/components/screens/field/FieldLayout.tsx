import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GeolocationPrompt } from "@/components/ui/geolocation-prompt";
import { MotionPermissionBanner } from "@/components/ui/MotionPermissionBanner";
import { FieldHeader } from "./FieldHeader";
import { FieldMapLayer } from "./FieldMapLayer";
import { FieldUILayer } from "./FieldUILayer";
import { FieldModalLayer } from "./FieldModalLayer";
import { FieldSystemLayer } from "./FieldSystemLayer";
import { useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { useFieldGestures } from "@/hooks/useFieldGestures";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useRef } from "react";
import type { FieldData } from "./FieldDataProvider";

interface FieldLayoutProps {
  data: FieldData;
}

export const FieldLayout = ({ data }: FieldLayoutProps) => {
  const { location, isLocationReady } = useFieldLocation();
  const { setVenuesSheetOpen } = useFieldUI();
  const { people } = useFieldSocial();
  const { startTracking, stopTracking, setLocation, error: locationError, loading: locationLoading, isTracking, pos } = useUserLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureHandlers = useFieldGestures(canvasRef);

  // Debug logging for location tracking state
  console.log('[FieldLayout] Location tracking state:', {
    isTracking,
    isLocationReady,
    locationError,
    locationLoading,
    hasPos: !!pos,
    posValue: pos,
    hasLocation: !!location,
    locationValue: location
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
    // Set debug location directly in useUserLocation
    const dummyLocation = {
      coords: {
        latitude: 34.009,
        longitude: -118.497,
        accuracy: 50
      },
      geohash: ''
    };

    // Update the location state directly
    console.log('[DEBUG] Setting dummy location:', dummyLocation);
    setLocation(dummyLocation);

    // Stop tracking to prevent overlay restart
    stopTracking();
  };

  // ---- helper flags ---------------------------------------------
  const geoReady = isLocationReady && location?.lat != null;
  const geoLoading = !isLocationReady && locationError == null;
  const geoError = locationError === 'denied';

  // ---- UI --------------------------------------------------------
  if (geoError) {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt
              onRequestLocation={startTracking}     // ← user gesture
              error="denied"
              loading={false}
              onSetDebugLocation={handleDebugLocation}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!geoReady) {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt
              onRequestLocation={startTracking}
              error={null}
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

        {/* System Layer (FAB, accessibility) - z-70+ */}
        <FieldSystemLayer data={data} />
      </div>
    </ErrorBoundary>
  );
};