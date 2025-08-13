
import React, { useRef, useState, useCallback } from 'react';
import { FieldWebMap } from '@/components/maps/FieldWebMap';
import { FieldCanvasLayer } from '@/components/field/FieldCanvasLayer';
import { FieldUILayer } from './FieldUILayer';

import { FieldDataTestPanel } from '@/components/field/FieldDataTestPanel';
import { VenueLoadingOverlay } from '@/components/venues/VenueLoadingOverlay';

import { useFieldSocial } from '@/components/field/contexts/FieldSocialContext';
import { useVenueSync } from '@/hooks/useVenueSync';
import type { FieldData } from '../field/FieldDataProvider';

interface FieldMapLayerProps {
  data: FieldData;
  people: any[];
  floqs?: any[];
  onRipple: (x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const FieldMapLayer: React.FC<FieldMapLayerProps> = ({
  data,
  people,
  floqs = [],
  onRipple,
  canvasRef
}) => {
  const { walkableFloqs, fieldTiles, realtime } = data;
  const { people: socialPeople } = useFieldSocial();
  
  // Phase 4 state management
  const [isConstellationMode, setIsConstellationMode] = useState(false);
  
  // Venue sync state (for loading overlay)
  const { isLoading: isVenueSyncing } = useVenueSync({ autoSync: false, showToasts: false });
  
  // Use social context people data instead of passed-in people
  const actualPeople = socialPeople.length ? socialPeople : people;
  
  // Auto-enable constellation mode for night hours
  const handleConstellationAutoToggle = useCallback(() => {
    const currentHour = new Date().getHours();
    const isNightTime = currentHour < 6 || currentHour > 20;
    if (isNightTime && !isConstellationMode) {
      setIsConstellationMode(true);
    } else if (!isNightTime && isConstellationMode) {
      setIsConstellationMode(false);
    }
  }, [isConstellationMode]);
  
  const handleStartChat = useCallback((friendId: string) => {
    console.log('[FieldMapLayer] Starting chat with friend:', friendId);
    // TODO: Implement chat navigation
  }, []);
  
  const handleShowOnMap = useCallback((friendId: string) => {
    console.log('[FieldMapLayer] Showing friend on map:', friendId);
    // TODO: Implement map focus on friend location
  }, []);

  // Stable region change handler to prevent map re-initialization
  const handleRegionChange = useCallback((bounds: any) => {
    // Currently not needed, but keeping stable reference to prevent re-renders
    // console.log('[FieldMapLayer] Region changed:', bounds);
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Layer 1: Unified Map System (Mapbox + coordinated layers) */}
      <FieldWebMap 
        key="field-web-map" // Stable key to prevent unnecessary re-mounts
        visible={true} 
        floqs={walkableFloqs} 
        realtime={realtime}
        onRegionChange={handleRegionChange} // Stable callback reference
      >
        {/* Layer 2: PIXI Canvas Overlay - now mounted as child of FieldWebMap */}
        <div className="pointer-events-none absolute inset-0 z-30">
          <FieldCanvasLayer
            canvasRef={canvasRef}
            people={actualPeople}
            floqs={floqs}
            data={data}
            onRipple={onRipple}
            isConstellationMode={isConstellationMode}
            showDebugVisuals={isDebugVisible}
          />
        </div>
      </FieldWebMap>
      
      {/* Venue Loading Overlay */}
      <VenueLoadingOverlay show={isVenueSyncing} />
      
      {/* Layer 3: UI Controls */}
      <FieldUILayer data={data} />
      
      {/* Data Flow Test Panel (dev only) */}
      {/* Debug panel now managed by FieldLayout and accessed via LayerSelectionFab */}
    </div>
  );
};
