import * as React from 'react';
import { Separator } from '@/components/ui/separator';
import { useWavesNear } from '@/hooks/useWavesNear';
import { useWaveRippleOverview } from '@/hooks/useWaveRippleOverview';
import WaveMapWeb from '../map/WaveMap.web';

export type WaveMapPanelProps = {
  lat: number;
  lng: number;
};

export function WaveMapPanel({ lat, lng }: WaveMapPanelProps) {
  const { data: overview } = useWaveRippleOverview({ lat, lng });
  const { data: waves, loading } = useWavesNear({ lat, lng, friendsOnly: true });

  return (
    <div className="space-y-3 p-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Waves nearby</h3>
        <span className="text-sm text-muted-foreground">
          {overview ? `${overview.waves_with_friends}/${overview.waves_total} with friends` : '—'}
        </span>
      </div>
      {/* Platform-specific map component - bundlers will resolve .web/.native automatically */}
      <WaveMapWeb 
        lat={lat} 
        lng={lng} 
        markers={(waves ?? []).map(w => ({ 
          id: w.cluster_id, 
          lat: w.centroid_lat, 
          lng: w.centroid_lng, 
          size: w.size, 
          friends: w.friends_in_cluster 
        }))} 
      />
      <Separator />
      <div className="space-y-2">
        {(waves ?? []).map(w => (
          <div key={w.cluster_id} className="flex justify-between">
            <span>Size {w.size}</span>
            <span className="text-sm text-muted-foreground">{w.friends_in_cluster} friends · {Math.round(w.distance_m)} m</span>
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </div>
  );
}