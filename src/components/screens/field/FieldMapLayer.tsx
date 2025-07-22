
import React from 'react';
import { BaseMap } from '@/components/maps/BaseMap';
import { FieldCanvas } from '@/components/field/FieldCanvas';
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
  const handleRegionChange = (bounds: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => {
    // TODO: Update field tiles based on new viewport bounds
    console.log('Map region changed:', bounds);
  };

  return (
    <div className="absolute inset-0">
      <BaseMap onRegionChange={handleRegionChange}>
        <FieldCanvas
          ref={canvasRef}
          people={people}
          tileIds={data.tileIds}
          fieldTiles={data.fieldTiles}
          viewportGeo={data.viewport}
          onRipple={onRipple}
        />
      </BaseMap>
    </div>
  );
};
