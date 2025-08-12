
import { Z, zIndex } from "@/constants/z";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useAutoCheckIn } from "@/hooks/useAutoCheckIn";
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { liveRef } = useFieldUI();
  
  // Activate enhanced auto check-in system
  const autoCheckIn = useAutoCheckIn();

  return (
    <>

      {/* ——— Auto Check-in Status (Development Only) —————————————— */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed bottom-4 left-4 pointer-events-none"
          {...zIndex('system')}
        >
          <div className="bg-accent text-accent-foreground px-3 py-2 rounded-lg shadow-lg text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                autoCheckIn.isDetecting ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <div>
                <div className="font-medium">Auto Check-in Active</div>
                {autoCheckIn.detectedVenues.length > 0 && (
                  <div className="text-xs opacity-90">
                    Tracking: {autoCheckIn.detectedVenues[0].name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——— ARIA Live-region for screen readers —— */}
      <div 
        ref={liveRef}
        className="sr-only" 
        aria-live="polite"
        aria-atomic="true"
        {...zIndex('system')}
      >
        {/* Live region content */}
      </div>
    </>
  );
};
