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
import { TimeScrubber } from "@/components/TimeScrubber";

interface FieldLayoutProps {
  data: FieldData;
}

export const FieldLayout = ({ data }: FieldLayoutProps) => {
  const { location, isLocationReady } = useFieldLocation();
  const { setVenuesSheetOpen } = useFieldUI();
  const { people } = useFieldSocial();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureHandlers = useFieldGestures(canvasRef);

  // Debug logging for location tracking state
  console.log('[FieldLayout] Location tracking state:', {
    isLocationReady,
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

        {/* Time Scrubber - z-60 */}
        <TimeScrubber />

        {/* System Layer (FAB, accessibility) - z-70+ */}
        <FieldSystemLayer data={data} />

        {/* Debug Layer (development only) - z-200+ */}
        <TileDebugVisual
          fieldTiles={data.fieldTiles}
          visible={data.showDebugVisuals}
        />
      </div>
    </ErrorBoundary>
  );
};