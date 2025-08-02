
import React, { useRef, useState, useCallback } from 'react';
import { FieldMapBase } from '@/components/maps/FieldMapBase';
import { FieldCanvasLayer } from '@/components/field/FieldCanvasLayer';
import { FieldUILayer } from './FieldUILayer';
import { FieldDebugPanel } from '@/components/field/FieldDebugPanel';
import { FriendSuggestionCarousel } from '@/components/field/FriendSuggestionCarousel';
import { useFieldSocial } from '@/components/field/contexts/FieldSocialContext';
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
  const [timeWarpHour, setTimeWarpHour] = useState(new Date().getHours());
  
  // Use social context people data instead of passed-in people
  const actualPeople = socialPeople.length ? socialPeople : people;
  
  // Check if map is ready to prevent projectLatLng errors
  const isMapReady = Boolean(getMapInstance());
  
  // Phase 4 handlers
  const handleTimeWarp = useCallback((hours: number) => {
    setTimeWarpHour(hours);
    // Automatically enable constellation mode for night hours
    const isNightTime = hours < 6 || hours > 20;
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

  return (
    <div className="absolute inset-0">
      {/* Layer 1: Base Map */}
      <FieldMapBase 
        visible={true} 
        floqs={walkableFloqs} 
        realtime={realtime}
      />
      
      {/* Layer 2: PIXI Canvas Overlay with Phase 4 enhancements - only render when map is ready */}
      {isMapReady && (
        <FieldCanvasLayer
          canvasRef={canvasRef}
          people={actualPeople}
          floqs={floqs}
          data={data}
          onRipple={onRipple}
          isConstellationMode={isConstellationMode}
          timeWarpHour={timeWarpHour}
          showDebugVisuals={isDebugVisible}
        />
      )}
      
      {/* Layer 3: UI Controls */}
      <FieldUILayer data={data} />
      
      {/* Phase 4: Enhanced UI Components */}
      
      {/* Friend Suggestion Carousel */}
      <div className="absolute bottom-4 left-4 max-w-sm">
        <FriendSuggestionCarousel
          onStartChat={handleStartChat}
          onShowOnMap={handleShowOnMap}
        />
      </div>
      
      {/* Debug Panel with Time Warp */}
      <FieldDebugPanel
        isVisible={isDebugVisible}
        onToggle={() => setIsDebugVisible(!isDebugVisible)}
        tileData={fieldTiles}
        presenceData={actualPeople}
        clusterData={[]} // TODO: Pass actual cluster data
        onTimeWarp={handleTimeWarp}
        currentTime={new Date()}
        isConstellationMode={isConstellationMode}
        onConstellationToggle={() => setIsConstellationMode(!isConstellationMode)}
      />
    </div>
  );
};
