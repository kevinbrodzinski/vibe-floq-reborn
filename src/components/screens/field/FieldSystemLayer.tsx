
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
      {/* ——— Fullscreen-map FAB —————————————— */}
      <div 
        className="fixed bottom-24 right-4 pointer-events-auto"
        {...zIndex('system')}
      >
        <FullscreenFab />
      </div>

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
