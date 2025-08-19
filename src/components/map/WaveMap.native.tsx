import React from 'react';

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number };
export default function WaveMapNative({ lat, lng, markers }: { lat: number; lng: number; markers: WaveMarker[] }) {
  // TODO: integrate react-native-maps; placeholder only to keep types aligned with web
  return (
    <div className="p-3 bg-muted rounded-md">
      <p className="text-sm text-muted-foreground mb-2">Map (native) placeholder @ {lat.toFixed(4)}, {lng.toFixed(4)}</p>
      <div className="space-y-1">
        {markers.map(m => (
          <p key={m.id} className="text-xs">• {m.lat.toFixed(4)},{m.lng.toFixed(4)} · size {m.size} · friends {m.friends}</p>
        ))}
      </div>
    </div>
  );
}