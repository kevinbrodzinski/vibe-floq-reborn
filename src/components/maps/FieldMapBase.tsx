import React from 'react';
import { FieldWebMap } from './FieldWebMap';
import { useFieldViewport } from '@/hooks/useFieldViewport';

interface FieldMapBaseProps {
  visible?: boolean;
  floqs?: any[];
  realtime?: boolean;
}

export const FieldMapBase: React.FC<FieldMapBaseProps> = ({ 
  visible = true,
  floqs = [],
  realtime = false
}) => {
  const { onRegionChange } = useFieldViewport();

  return (
    <div className="absolute inset-0">
      <FieldWebMap 
        visible={visible} 
        onRegionChange={onRegionChange} 
        floqs={floqs}
        realtime={realtime}
      />
    </div>
  );
}; 