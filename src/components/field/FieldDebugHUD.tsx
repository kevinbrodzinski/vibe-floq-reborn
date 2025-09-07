import * as React from 'react';
import { cn } from '@/lib/utils';

export function FieldDebugHUD({ 
  metrics, 
  flowCellsRendered = 0, 
  lanesRendered = 0,
  pressureCellsRendered = 0,
  stormGroupsRendered = 0,
  className 
}: { 
  metrics?: {
    fps: number;
    workerTime: number;
    deviceTier: string;
  };
  flowCellsRendered?: number;
  lanesRendered?: number;
  pressureCellsRendered?: number;
  stormGroupsRendered?: number;
  className?: string;
}) {
  // Only show in dev with debug flag
  if (!import.meta.env.DEV) return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('debug')?.includes('field')) return null;

  return (
    <div className={cn(
      'fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50',
      className
    )}>
      <div className="space-y-1">
        <div>FPS: {metrics?.fps ?? 0}</div>
        <div>Worker: {metrics?.workerTime?.toFixed(1) ?? 0}ms</div>
        <div>Device: {metrics?.deviceTier ?? 'unknown'}</div>
        <div>Flow: {flowCellsRendered} arrows</div>
        <div>Lanes: {lanesRendered}</div>
        <div>Pressure: {pressureCellsRendered} cells</div>
        <div>Storms: {stormGroupsRendered} groups</div>
      </div>
    </div>
  );
}