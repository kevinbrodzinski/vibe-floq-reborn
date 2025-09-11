import * as React from 'react';
import { buildConvergenceStories } from '@/lib/flow/reflection/stories';

export type LatLng = { lng: number; lat: number };
export type Peak = { t: number | Date | string; energy: number };
export type SegForStory = { t: number | Date | string; center: LatLng };
export type VenueLite = { id: string; name: string; loc: LatLng; categories?: string[] };

export function useConvergenceStories(args: {
  peaks: Peak[] | undefined;
  segments: SegForStory[] | undefined;
  venues?: VenueLite[] | undefined;
  maxStories?: number;
  peakWindowMin?: number;
}) {
  const { peaks, segments, venues = [], maxStories = 4, peakWindowMin = 10 } = args;

  const stories = React.useMemo(() => {
    if (!peaks?.length || !segments?.length) return [];
    return buildConvergenceStories({
      peaks, segments, venues, maxStories, peakWindowMin
    });
  }, [peaks, segments, venues, maxStories, peakWindowMin]);

  const onViewMap = React.useCallback((s: any) => {
    if (!s?.nearby) return;
    // Heuristic confidence + ETA from energy (same as your FlowEnergyPanel jump)
    const e = Math.max(0, Math.min(1, s.energy ?? 0.5));
    const detail = {
      lng: s.nearby.lng, lat: s.nearby.lat,
      prob: Math.max(0.25, Math.min(0.95, 0.25 + 0.7 * e)),
      etaMin: Math.max(3, 15 - Math.round(e * 10)),
      groupMin: 3
    };
    window.dispatchEvent(new CustomEvent('floq:open-convergence', { detail }));
  }, []);

  return { stories, onViewMap };
}