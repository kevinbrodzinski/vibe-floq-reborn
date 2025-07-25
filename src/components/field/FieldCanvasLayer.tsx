import React from 'react';
import { FieldCanvas } from './FieldCanvas';
import type { FieldData } from '../screens/field/FieldDataProvider';

interface FieldCanvasLayerProps {
  data: FieldData;
  people: any[];
  floqs?: any[];
  onRipple: (x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const FieldCanvasLayer: React.FC<FieldCanvasLayerProps> = ({
  data,
  people,
  floqs = [],
  onRipple,
  canvasRef
}) => {
  return (
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
      />
    </div>
  );
}; 