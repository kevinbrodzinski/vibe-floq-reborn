import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { YStack, XStack, Text, Separator, Button } from 'tamagui';
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
    <YStack gap="$3" padding="$3">
      <XStack jc="space-between" ai="center">
        <Text fontSize="$7" fontWeight="700">Waves nearby</Text>
        <Text opacity={0.7}>{overview ? `${overview.waves_with_friends}/${overview.waves_total} with friends` : '—'}</Text>
      </XStack>
      {/* Web map placeholder; native equivalent in WaveMap.native */}
      <WaveMapWeb lat={lat} lng={lng} markers={(waves ?? []).map(w => ({ id: w.cluster_id, lat: w.centroid_lat, lng: w.centroid_lng, size: w.size, friends: w.friends_in_cluster }))} />
      <Separator />
      <YStack gap="$2">
        {(waves ?? []).map(w => (
          <XStack key={w.cluster_id} jc="space-between">
            <Text>Size {w.size}</Text>
            <Text>{w.friends_in_cluster} friends · {Math.round(w.distance_m)} m</Text>
          </XStack>
        ))}
        {loading && <Text opacity={0.7}>Loading…</Text>}
      </YStack>
    </YStack>
  );
}