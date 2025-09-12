
import React from 'react';
import { Z, zIndex } from "@/constants/z";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useAutoCheckIn } from "@/hooks/useAutoCheckIn";
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { addRippleHeatlineLayer } from '@/lib/flow/reflection/rippleHeatline';
import { useFriendFlows } from '@/components/field/hooks/useFriendFlows';
import { addFriendFlowsLayer } from '@/lib/map/friendFlowsLayer';
import { useFlowHUD } from '@/components/flow/hooks/useFlowHUD';
import { FlowMomentumHUD } from '@/components/flow/FlowMomentumHUD';
import { HeatlineToggle } from '@/components/ui/HeatlineToggle';
import { socialCache } from '@/lib/social/socialCache';
import { useVibeNow } from '@/hooks/useVibeNow';
import { Badge } from '@/components/ui/badge';
import type { FieldData } from "./FieldDataProvider";

interface FieldSystemLayerProps {
  data: FieldData;
}

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { liveRef } = useFieldUI();
  const map = getCurrentMap();
  
  // Activate enhanced auto check-in system
  const autoCheckIn = useAutoCheckIn();

  // Get current vibe for social signal detection
  const { currentVibe } = useVibeNow();

  // Friend Flows overlay
  const friendFlows = useFriendFlows(map);
  React.useEffect(() => {
    if (!map) return;
    const cleanup = addFriendFlowsLayer(map, friendFlows ?? []);
    // If no rows, we still mounted; prefer removing entirely:
    if (!friendFlows?.length) { cleanup(); return; }
    return cleanup;
  }, [map, friendFlows]);

  // Update social cache with friend flows for vibe engine
  React.useEffect(() => {
    if (friendFlows?.length) {
      const friendHeads = friendFlows.map(f => ({
        lng: f.head_lng,
        lat: f.head_lat,
        t_head: f.t_head
      }));
      socialCache.setFriendHeads(friendHeads);
    }
  }, [friendFlows]);

  // Flow HUD (mock data for now - will connect to real flow recorder later)
  const mockEnergy = React.useMemo(() => [
    { t: Date.now() - 300000, energy: 0.4 },
    { t: Date.now() - 240000, energy: 0.5 },
    { t: Date.now() - 180000, energy: 0.7 },
    { t: Date.now() - 120000, energy: 0.8 },
    { t: Date.now() - 60000, energy: 0.6 },
    { t: Date.now(), energy: 0.7 }
  ], []);

  const mockPath = React.useMemo(() => [
    { lng: -118.4695, lat: 33.9855, t: Date.now() - 300000 },
    { lng: -118.4696, lat: 33.9856, t: Date.now() - 240000 },
    { lng: -118.4697, lat: 33.9857, t: Date.now() - 180000 },
  ], []);

  const hud = useFlowHUD({
    energy: mockEnergy,
    myPath: mockPath,
    friendFlows: friendFlows.map(f => ({ 
      head_lng: f.head_lng, 
      head_lat: f.head_lat, 
      t_head: f.t_head 
    }))
  });

  // Update social cache with mock path (will be replaced with real flow tracking)
  React.useEffect(() => {
    socialCache.setMyPath(mockPath);
    // Mock convergence probability - would come from convergence detector
    socialCache.setConvergenceProb(hud.cohesion.cohesion > 0.3 ? 0.6 : 0.2);
  }, [mockPath, hud.cohesion]);

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
      {/* ——— Flow HUD (Momentum & Cohesion) —————————————— */}
      <FlowMomentumHUD momentum={hud.momentum} cohesion={hud.cohesion} />

      {/* ——— Social Signal Nudge —————————————— */}
      {currentVibe.sources.includes('social') && hud.cohesion.nearby > 0 && (
        <div className="fixed left-4 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-[560]">
          <Badge variant="secondary" className="bg-indigo-500/90 text-white border-indigo-300/20 backdrop-blur">
            👥 {hud.cohesion.nearby} nearby
          </Badge>
        </div>
      )}

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
      <HeatlineToggle 
        on={heatlineOn} 
        onToggle={setHeatlineOn}
      />

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
