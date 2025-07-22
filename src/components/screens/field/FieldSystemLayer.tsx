
import { FullscreenFab } from "@/components/map/FullscreenFab";
import { Z } from "@/constants/zLayers";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { liveRef } = useFieldUI();

  console.log('🔧 [FieldSystemLayer] Rendering with z-index:', Z.debug);

  return (
    <>
      {/* Full-screen toggle FAB - positioned at highest z-index */}
      <div 
        style={{ 
          zIndex: Z.debug,
          '--fab-z-index': Z.debug 
        } as React.CSSProperties & { '--fab-z-index': number }}
      >
        <FullscreenFab />
      </div>

      {/* Live region for accessibility */}
      <p 
        ref={liveRef} 
        className="sr-only" 
        aria-live="polite"
        style={{ zIndex: Z.debug }}
      />
    </>
  );
};
