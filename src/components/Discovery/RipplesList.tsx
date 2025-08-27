import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRipplesNear } from '../../hooks/useRipplesNear';

export default function RipplesList({ client, lat, lng }: { client: SupabaseClient; lat: number; lng: number }) {
  const { data: ripples, loading } = useRipplesNear(client, { lat, lng });
  
  return (
    <div className="space-y-2 p-3">
      <h3 className="text-xl font-bold">Ripples</h3>
      
      <div className="space-y-2">
        {(ripples ?? []).map(r => (
          <div key={r.ripple_id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
            <span className="text-sm">
              {r.includes_friend ? (r.both_friends ? 'Both friends' : 'Friend + 1') : 'Nearby pair'}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(r.distance_m)} m
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-center text-sm text-muted-foreground">Loading…</div>
        )}
      </div>
    </div>
  );
}