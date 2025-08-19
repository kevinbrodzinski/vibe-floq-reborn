import * as React from 'react';
import { useRipplesNear } from '@/hooks/useRipplesNear';

export function RipplesList({ lat, lng }: { lat: number; lng: number }) {
  const { data: ripples, loading } = useRipplesNear({ lat, lng });
  return (
    <div className="space-y-2 p-3">
      <h3 className="text-xl font-bold">Ripples</h3>
      {(ripples ?? []).map(r => (
        <div key={r.ripple_id} className="flex justify-between">
          <span>{r.includes_friend ? (r.both_friends ? 'Both friends' : 'Friend + 1') : 'Nearby pair'}</span>
          <span className="text-sm text-muted-foreground">{Math.round(r.distance_m)} m</span>
        </div>
      ))}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  );
}