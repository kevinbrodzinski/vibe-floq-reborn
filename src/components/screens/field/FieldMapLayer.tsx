
import React, { useRef, useState, useCallback } from 'react';
import { FieldWebMap } from '@/components/maps/FieldWebMap';
import { FieldCanvasLayer } from '@/components/field/FieldCanvasLayer';
import { FieldUILayer } from './FieldUILayer';
import { FieldDebugPanel } from '@/components/field/FieldDebugPanel';
import { FieldDataTestPanel } from '@/components/field/FieldDataTestPanel';
import { VenueLoadingOverlay } from '@/components/venues/VenueLoadingOverlay';

import { useFieldSocial } from '@/components/field/contexts/FieldSocialContext';
import { useVenueSync } from '@/hooks/useVenueSync';
import { getMapInstance } from '@/lib/geo/project';
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
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [isConstellationMode, setIsConstellationMode] = useState(false);
  
  // Venue sync state (for loading overlay)
  const { isLoading: isVenueSyncing } = useVenueSync({ autoSync: false, showToasts: false });
  
  // Use social context people data instead of passed-in people
  const actualPeople = socialPeople.length ? socialPeople : people;
  
  // Check if map is ready to prevent projection errors
  const isMapReady = Boolean(getMapInstance());
  
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

  // Region change handler - removed as not currently needed
  // const handleRegionChange = useCallback((bounds: any) => {
  //   console.log('[FieldMapLayer] Region changed:', bounds);
  // }, []);

  return (
    <div className="absolute inset-0">
      {/* Layer 1: Unified Map System (Mapbox + coordinated layers) */}
      <FieldWebMap 
        visible={true} 
        floqs={walkableFloqs} 
        realtime={realtime}
        onRegionChange={() => {}} // Minimal handler
      />
      
      {/* Venue Loading Overlay */}
      <VenueLoadingOverlay show={isVenueSyncing} />
      
      {/* Layer 2: PIXI Canvas Overlay - only render when map is ready */}
      {isMapReady && (
        <FieldCanvasLayer
          canvasRef={canvasRef}
          people={actualPeople}
          floqs={floqs}
          data={data}
          onRipple={onRipple}
          isConstellationMode={isConstellationMode}
          showDebugVisuals={isDebugVisible}
        />
      )}
      
      {/* Layer 3: UI Controls */}
      <FieldUILayer data={data} />
      
      {/* Data Flow Test Panel (dev only) */}
      {process.env.NODE_ENV === 'development' && isDebugVisible && (
        <div className="absolute top-4 left-4 max-w-md">
          <FieldDataTestPanel />
        </div>
      )}

      {/* Debug Panel with Time Warp */}
      <FieldDebugPanel
        isVisible={isDebugVisible}
        onToggle={() => setIsDebugVisible(!isDebugVisible)}
        tileData={fieldTiles}
        presenceData={actualPeople}
        clusterData={walkableFloqs} // Use actual floq data as clusters
        currentTime={new Date()}
        isConstellationMode={isConstellationMode}
        onConstellationToggle={() => setIsConstellationMode(!isConstellationMode)}
      />
    </div>
  );
};
