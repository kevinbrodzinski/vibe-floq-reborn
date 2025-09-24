import React from 'react';
import { FieldWebMap } from '@/components/maps/FieldWebMap';
import { useFieldViewport } from '@/hooks/useFieldViewport';
import { FieldWithProactiveFeatures } from '@/components/field/FieldWithProactiveFeatures';

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
    <FieldWithProactiveFeatures>
      <div className="absolute inset-0" style={{ height: '100vh', width: '100%', minHeight: '400px' }}>
        <FieldWebMap 
          visible={visible} 
          onRegionChange={onRegionChange} 
          floqs={floqs}
          realtime={realtime}
        />
      </div>
    </FieldWithProactiveFeatures>
  );
}; 