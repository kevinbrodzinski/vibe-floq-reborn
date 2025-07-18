
import React from 'react';
import { FieldCanvas } from '@/components/field/FieldCanvas';
import type { FieldData } from '../field/FieldDataProvider';

interface FieldMapLayerProps {
  data: FieldData;
  people: any[];
  onRipple: (x: number, y: number) => void;
}

export const FieldMapLayer: React.FC<FieldMapLayerProps> = ({
  data,
  people,
  onRipple
}) => {
  return (
    <div className="absolute inset-0">
      <FieldCanvas
        people={people}
        tileIds={data.tileIds}
        fieldTiles={data.fieldTiles}
        viewportGeo={data.viewport}
        onRipple={onRipple}
      />
    </div>
  );
};
