
import { FullscreenFab } from "@/components/map/FullscreenFab";
import { Z, zIndex } from "@/constants/z";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { liveRef } = useFieldUI();

  return (
    <>
      {/* ——— Full-screen toggle —————————————————— */}
      <div 
        className="fixed bottom-24 left-4 pointer-events-auto"
        style={zIndex('system')}
      >
        <FullscreenFab />
      </div>

      {/* ——— ARIA Live-region for screen readers —— */}
      <p 
        ref={liveRef} 
        className="sr-only" 
        aria-live="polite"
        style={zIndex('system')}
      />
    </>
  );
};
