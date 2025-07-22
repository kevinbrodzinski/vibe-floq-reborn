import { FullscreenFab } from "@/components/map/FullscreenFab";
import { Z } from "@/constants/zLayers";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { liveRef } = useFieldUI();

  return (
    <>
      {/* Full-screen toggle FAB */}
      <div 
        className="fixed pointer-events-none"
        style={{ 
          zIndex: Z.system,
          inset: 0
        }}
      >
        <div className="pointer-events-auto">
          <FullscreenFab />
        </div>
      </div>

      {/* Live region for accessibility */}
      <p 
        ref={liveRef} 
        className="sr-only" 
        aria-live="polite"
        style={{ zIndex: Z.system }}
      />
    </>
  );
};