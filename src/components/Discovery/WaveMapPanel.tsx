import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useWavesNear } from '../../hooks/useWavesNear';
import { useWaveRippleOverview } from '../../hooks/useWaveRippleOverview';
import WaveMapWeb from '../map/WaveMap.web';

export type WaveMapPanelProps = {
  client: SupabaseClient;
  lat: number;
  lng: number;
};

export default function WaveMapPanel({ client, lat, lng }: WaveMapPanelProps) {
  const { data: overview } = useWaveRippleOverview(client, { lat, lng });
  const { data: waves, loading } = useWavesNear(client, { lat, lng, friendsOnly: true });

  return (
    <div className="space-y-3 p-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Waves nearby</h3>
        <span className="text-sm text-muted-foreground">
          {overview ? `${overview.waves_with_friends}/${overview.waves_total} with friends` : '—'}
        </span>
      </div>
      
      {/* Web map placeholder; native equivalent in WaveMap.native */}
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
      
      <div className="border-t border-border pt-3">
        <div className="space-y-2">
          {(waves ?? []).map(w => (
            <div key={w.cluster_id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
              <span className="text-sm">Size {w.size}</span>
              <span className="text-xs text-muted-foreground">
                {w.friends_in_cluster} friends · {Math.round(w.distance_m)} m
              </span>
            </div>
          ))}
          {loading && (
            <div className="text-center text-sm text-muted-foreground">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}