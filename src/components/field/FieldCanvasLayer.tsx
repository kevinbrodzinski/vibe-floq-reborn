import React, { useState } from 'react';
import { FieldCanvas } from './FieldCanvas';
import { TileDebugVisual } from './TileDebugVisual';
import { PresenceDebugPanel } from './PresenceDebugPanel';
import type { FieldData } from '../screens/field/FieldDataProvider';

interface FieldCanvasLayerProps {
  data: FieldData;
  people: any[];
  floqs?: any[];
  onRipple: (x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isConstellationMode?: boolean;
  
  showDebugVisuals?: boolean;
}

export const FieldCanvasLayer: React.FC<FieldCanvasLayerProps> = ({
  data,
  people,
  floqs = [],
  onRipple,
  canvasRef,
  isConstellationMode = false,
  
  showDebugVisuals = false
}) => {
  const [showTileDebug, setShowTileDebug] = useState(false);
  const [constellationMode, setConstellationMode] = useState(isConstellationMode);
  

  const lastTileUpdate = data.fieldTiles.length > 0 
    ? data.fieldTiles[0]?.updated_at 
    : undefined;

  return (
    <>
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 5 }} // Above map, below UI
      >
        <FieldCanvas
          ref={canvasRef}
          people={people}
          floqs={floqs}
          tileIds={data.tileIds}
          fieldTiles={data.fieldTiles}
          viewportGeo={data.viewport}
          onRipple={onRipple}
          isConstellationMode={constellationMode}
          showDebugVisuals={showDebugVisuals}
        />
      </div>

      {/* Debug overlays disabled */}
      {false && (
        <TileDebugVisual
          fieldTiles={data.fieldTiles}
          visible={showTileDebug}
        />
      )}

      {/* Debug control panel */}
      <PresenceDebugPanel
        showTileDebug={showTileDebug}
        onToggleTileDebug={setShowTileDebug}
        fieldTileCount={data.fieldTiles.length}
        lastTileUpdate={lastTileUpdate}
        isConstellationMode={constellationMode}
        onToggleConstellationMode={setConstellationMode}
      />
    </>
  );
};