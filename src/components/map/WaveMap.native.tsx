import React from 'react';

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number; venueName?: string };

export default function WaveMapNative({ lat, lng, markers, onSelect }: {
  lat: number; lng: number; markers: WaveMarker[]; onSelect?: (m: WaveMarker) => void;
}) {
  // Placeholder for native - use web map for now since this is a web build
  return (
    <div className="w-full h-full bg-muted rounded-xl flex flex-col items-center justify-center p-4">
      <p className="text-sm text-muted-foreground text-center mb-2">
        Native Map Placeholder
      </p>
      <p className="text-xs text-muted-foreground text-center mb-4">
        Map @ {lat.toFixed(4)}, {lng.toFixed(4)}
      </p>
      <div className="space-y-1 w-full">
        {markers.slice(0, 5).map((m) => (
          <div 
            key={m.id} 
            className="text-xs p-2 bg-background rounded cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onSelect?.(m)}
          >
            <div className="font-medium">
              {m.venueName ? `Near ${m.venueName}` : `Wave size ${m.size}`}
            </div>
            <div className="text-muted-foreground">
              {m.friends} friends • {Math.round(Math.sqrt((m.lat - lat) ** 2 + (m.lng - lng) ** 2) * 111000)}m
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}