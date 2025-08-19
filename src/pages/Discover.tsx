import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useWaveRippleOverview } from '@/hooks/useWaveRippleOverview';
import { useWavesNear } from '@/hooks/useWavesNear';
import { useRipplesNear } from '@/hooks/useRipplesNear';
import WaveMapWeb from '@/components/map/WaveMap.web';
import WaveMapNative from '@/components/map/WaveMap.native';
import WaveListItem from '@/components/discovery/WaveListItem';
import RippleListItem from '@/components/discovery/RippleListItem';
import FilterChips from '@/components/discovery/FilterChips';
import { createMomentaryFromWave } from '@/lib/createFloqFromWave';

function PlatformMap({ lat, lng, markers }: { lat: number; lng: number; markers: any[] }) {
  // bundlers will tree-shake the wrong one; this indirection avoids conditional imports
  // @ts-expect-error platform resolution
  const isWeb = typeof window !== 'undefined' && !(window as any).Expo;
  return isWeb ? (
    <WaveMapWeb lat={lat} lng={lng} markers={markers} />
  ) : (
    <WaveMapNative lat={lat} lng={lng} markers={markers} />
  );
}

export default function Discover() {
  // TODO: wire to real device coords (web: navigator.geolocation, native: expo-location)
  const [lat, setLat] = useState(34.0522);
  const [lng, setLng] = useState(-118.2437);
  const [radiusM, setRadiusM] = useState(1500);
  const [friendsOnly, setFriendsOnly] = useState(true);

  const { data: overview } = useWaveRippleOverview({ lat, lng, radiusM });
  const { data: waves, loading: wavesLoading, refetch: refetchWaves } = useWavesNear({ lat, lng, radiusM, friendsOnly });
  const { data: ripples, loading: ripplesLoading, refetch: refetchRipples } = useRipplesNear({ lat, lng, radiusM });

  const markers = useMemo(() => (waves ?? []).map(w => ({
    id: w.cluster_id,
    lat: w.centroid_lat,
    lng: w.centroid_lng,
    size: w.size,
    friends: w.friends_in_cluster,
  })), [waves]);

  async function onWavePress(clusterId: string) {
    const wave = waves?.find(w => w.cluster_id === clusterId);
    if (!wave) return;
    const res = await createMomentaryFromWave({
      title: 'Tonight Run',
      vibe: 'chill', // or infer from context
      lat: wave.centroid_lat,
      lng: wave.centroid_lng,
      radiusM,
    });
    if (res?.floqId) {
      // navigate to floq route
      window.location.href = `/floqs/${res.floqId}`;
    }
  }

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Discover</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm">Friends only</span>
          <Switch checked={friendsOnly} onCheckedChange={setFriendsOnly} />
        </div>
      </div>

      {/* Filters */}
      <FilterChips
        radiusM={radiusM}
        onRadiusChange={(m) => setRadiusM(m)}
        onRefresh={() => { void refetchWaves(); void refetchRipples(); }}
      />

      {/* Map */}
      <div className="h-[300px]">
        <PlatformMap lat={lat} lng={lng} markers={markers} />
      </div>

      {/* Overview counters */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Waves: {overview ? `${overview.waves_with_friends}/${overview.waves_total} with friends` : '—'}</span>
        <span>Ripples: {overview ? `${overview.ripples_with_friends}/${overview.ripples_total} with friends` : '—'}</span>
      </div>

      <Separator />

      {/* Waves list */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Waves nearby</h2>
        {(waves ?? []).map(w => (
          <WaveListItem key={w.cluster_id} wave={w} onPress={() => onWavePress(w.cluster_id)} />
        ))}
        {wavesLoading && <p className="text-sm text-muted-foreground">Loading waves…</p>}
      </div>

      {/* Ripples list */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Ripples</h2>
        {(ripples ?? []).map(r => (
          <RippleListItem key={r.ripple_id} ripple={r} />
        ))}
        {ripplesLoading && <p className="text-sm text-muted-foreground">Loading ripples…</p>}
      </div>
    </div>
  );
}