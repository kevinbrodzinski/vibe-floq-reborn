import { FullscreenFab } from "@/components/map/FullscreenFab";
import { Z_LAYERS } from "@/lib/z-layers";
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { liveRef, mode } = data;

  return (
    <>
      {/* Full-screen toggle FAB */}
      <div 
        className="fixed pointer-events-none"
        style={{ 
          zIndex: Z_LAYERS.TOASTS,
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
        style={{ zIndex: Z_LAYERS.DEBUG }}
      />
    </>
  );
};