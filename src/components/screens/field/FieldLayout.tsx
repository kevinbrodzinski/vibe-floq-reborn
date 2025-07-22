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
import { useRef } from "react";
import type { FieldData } from "./FieldDataProvider";

interface FieldLayoutProps {
  data: FieldData;
}

export const FieldLayout = ({ data }: FieldLayoutProps) => {
  const { location, isLocationReady } = useFieldLocation();
  const { setVenuesSheetOpen } = useFieldUI();
  const { people } = useFieldSocial();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureHandlers = useFieldGestures(canvasRef);
  
  // Get shake detection functions for motion permission banner
  const { requestMotionPermission, isMotionAvailable } = useShakeDetection({
    enabled: false, // Just for permission access, not actual detection
    onShake: () => {},
    onLongPress: () => {},
    onMultiTouch: () => {}
  });

  // Handle ripple effect for canvas clicks
  const handleRipple = (x: number, y: number) => {
    // TODO: Implement ripple visual effect
    console.log('Ripple at:', x, y);
  };

  // Show geolocation prompt if no location and not loading, or if there's an error
  if ((!location?.lat && !location?.loading) || location?.error) {
    const requestLocation = () => {
      // For optimized geolocation, we trigger a reload to restart the process
      window.location.reload();
    };

    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt 
              onRequestLocation={requestLocation} 
              error={location?.error}
              loading={location?.loading}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show loading state
  if (location?.loading && !location?.lat) {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Getting your location...</p>
            </div>
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
        
        {/* UI Content Layer - z-10 to z-30 */}
        <FieldUILayer data={data} />
        
        {/* Base Map Layer - main flex container below header */}
        <main className="absolute top-20 left-0 right-0 bottom-0 overflow-hidden">
          <div className="relative h-full w-full" {...gestureHandlers}>
            <FieldMapLayer 
              data={data} 
              people={people} 
              onRipple={handleRipple}
              canvasRef={canvasRef}
            />
          </div>
        </main>
        
        {/* Modal/Sheet Layer - z-40 to z-60 */}
        <FieldModalLayer data={data} />
        
        {/* System Layer (FAB, accessibility) - z-70+ */}
        <FieldSystemLayer data={data} />
      </div>
    </ErrorBoundary>
  );
};