
import React from 'react';
import { FieldWebMap } from '@/components/maps/FieldWebMap';
import { FieldCanvas } from '@/components/field/FieldCanvas';
import { useFieldViewport } from '@/hooks/useFieldViewport';
import type { FieldData } from '../field/FieldDataProvider';

interface FieldMapLayerProps {
  data: FieldData;
  people: any[];
  onRipple: (x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const FieldMapLayer: React.FC<FieldMapLayerProps> = ({
  data,
  people,
  onRipple,
  canvasRef
}) => {
  const { onRegionChange } = useFieldViewport();

  return (
    <div className="absolute inset-0">
      <FieldWebMap visible={true} onRegionChange={onRegionChange}>
        {/* WebGL layer on top, no pointer events so map remains interactive */}
        <div style={{ pointerEvents: 'none' }}>
          <FieldCanvas
            ref={canvasRef}
            people={people}
            tileIds={data.tileIds}
            fieldTiles={data.fieldTiles}
            viewportGeo={data.viewport}
            onRipple={onRipple}
          />
        </div>
      </FieldWebMap>
    </div>
  );
};
