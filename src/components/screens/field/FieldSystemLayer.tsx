
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
      {/* Full-screen toggle FAB - positioned with CSS */}
      <div style={{ zIndex: Z.system }}>
        <FullscreenFab />
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
