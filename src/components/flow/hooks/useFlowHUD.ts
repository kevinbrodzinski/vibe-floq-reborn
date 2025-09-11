import * as React from 'react';
import { computeMomentum, computeCohesion } from '@/lib/flow/hudSignals';
import type { EnergySample, PathPoint } from '@/lib/flow/hudSignals';

export function useFlowHUD(args: {
  energy: EnergySample[];
  myPath: PathPoint[];
  friendFlows: Array<{ head_lng: number; head_lat: number; t_head: string }>;
}) {
  const { energy, myPath, friendFlows } = args;

  const momentum = React.useMemo(
    () => computeMomentum(energy ?? [], 3),
    [energy]
  );

  const cohesion = React.useMemo(
    () =>
      computeCohesion({
        myPath,
        friendHeads: friendFlows.map(f => ({ 
          lng: f.head_lng, 
          lat: f.head_lat, 
          t_head: f.t_head 
        })),
        distM: 150,
        timeMin: 12,
      }),
    [myPath, friendFlows]
  );

  return { momentum, cohesion };
}