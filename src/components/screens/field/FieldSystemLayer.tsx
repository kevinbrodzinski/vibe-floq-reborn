
import React from 'react';
import { Z, zIndex } from "@/constants/z";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useAutoCheckIn } from "@/hooks/useAutoCheckIn";
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { addRippleHeatlineLayer } from '@/lib/flow/reflection/rippleHeatline';
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { liveRef } = useFieldUI();
  const map = getCurrentMap();
  
  // Activate enhanced auto check-in system
  const autoCheckIn = useAutoCheckIn();

  // Heatline state
  const [heatlineOn, setHeatlineOn] = React.useState(false);
  const edgesRef = React.useRef<any[]>([]);
  const cleanupRef = React.useRef<null | (() => void)>(null);

  // Listen for heatline events from Reflection
  React.useEffect(() => {
    const onToggle = (e: CustomEvent<{on:boolean}>) => setHeatlineOn(!!e.detail?.on);
    const onSet = (e: CustomEvent<{edges:any[]}>) => { edgesRef.current = e.detail?.edges ?? []; };
    
    window.addEventListener('floq:heatline:toggle', onToggle as EventListener, { passive: true });
    window.addEventListener('floq:heatline:set', onSet as EventListener, { passive: true });
    
    return () => {
      window.removeEventListener('floq:heatline:toggle', onToggle as EventListener);
      window.removeEventListener('floq:heatline:set', onSet as EventListener);
    };
  }, []);

  // Mount/update heatline layer with cleanup ref
  React.useEffect(() => {
    if (!map) return;
    
    // Turn OFF → remove immediately
    if (!heatlineOn) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return;
    }
    
    // ON but no edges yet
    if (!edgesRef.current.length) return;

    // Mount/update
    cleanupRef.current?.();
    cleanupRef.current = addRippleHeatlineLayer(map as any, edgesRef.current);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [map, heatlineOn, edgesRef.current.length]);

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

      {/* ——— Heatline Toggle (Production) —————————————— */}
      <button
        onClick={() => setHeatlineOn(v => !v)}
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[560] px-3 py-1.5 rounded-full bg-card/80 border border-border text-foreground text-xs hover:bg-card"
        aria-pressed={heatlineOn}
        {...zIndex('ui')}
      >
        {heatlineOn ? 'Heatline: On' : 'Heatline: Off'}
      </button>

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
