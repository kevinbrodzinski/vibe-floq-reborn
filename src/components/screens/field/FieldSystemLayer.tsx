
import { FullscreenFab } from "@/components/map/FullscreenFab";
import { Z, zIndex } from "@/constants/z";
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  return (
    <>
      {/* ——— Full-screen toggle —————————————————— */}
      <div 
        className="fixed bottom-24 left-4 pointer-events-auto"
        {...zIndex('system')}
      >
        <FullscreenFab />
      </div>

      {/* ——— ARIA Live-region for screen readers —— */}
      <div 
        className="sr-only" 
        aria-live="polite"
        {...zIndex('system')}
      >
        {/* Live region content */}
      </div>
    </>
  );
};
