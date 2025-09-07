import React from 'react';
import { FieldDebugHUD } from './FieldDebugHUD';

interface FieldCanvasWrapperProps {
  children: React.ReactNode;
  metrics?: {
    fps: number;
    workerTime: number;
    deviceTier: string;
  };
  flowCellsRendered?: number;
  lanesRendered?: number;
  pressureCellsRendered?: number;
  stormGroupsRendered?: number;
}

export function FieldCanvasWrapper({ 
  children, 
  metrics,
  flowCellsRendered = 0,
  lanesRendered = 0,
  pressureCellsRendered = 0,
  stormGroupsRendered = 0
}: FieldCanvasWrapperProps) {
  return (
    <div className="relative w-full h-full">
      {children}
      <FieldDebugHUD 
        metrics={metrics}
        flowCellsRendered={flowCellsRendered}
        lanesRendered={lanesRendered}
        pressureCellsRendered={pressureCellsRendered}
        stormGroupsRendered={stormGroupsRendered}
      />
    </div>
  );
}