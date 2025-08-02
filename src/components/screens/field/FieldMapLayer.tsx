
import React, { useRef } from 'react';
import { FieldMapBase } from '@/components/maps/FieldMapBase';
import { FieldCanvasLayer } from '@/components/field/FieldCanvasLayer';
import { FieldUILayer } from './FieldUILayer';
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

  return (
    <div className="absolute inset-0">
      {/* Layer 1: Base Map */}
      <FieldMapBase 
        visible={true} 
        floqs={walkableFloqs} 
        realtime={realtime}
      />
      
      {/* Layer 2: PIXI Canvas Overlay */}
      <FieldCanvasLayer
        canvasRef={canvasRef}
        people={people}
        floqs={floqs}
        data={data}
        onRipple={onRipple}
      />
      
      {/* Layer 3: UI Controls */}
      <FieldUILayer data={data} />
    </div>
  );
};
