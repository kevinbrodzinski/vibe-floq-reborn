import React from 'react';

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number; venueName?: string };

export default function WaveMapNative({ lat, lng, markers, onSelect }: {
  lat: number; lng: number; markers: WaveMarker[]; onSelect?: (m: WaveMarker) => void;
}) {
  // For web builds, show a placeholder that explains this is for native
  return (
    <div className="w-full h-full bg-muted rounded-xl flex flex-col items-center justify-center p-4">
      <p className="text-sm text-muted-foreground text-center mb-2">
        Native Map Component
      </p>
      <p className="text-xs text-muted-foreground text-center">
        This will show React Native Maps when running on mobile
      </p>
      <div className="mt-4 space-y-1">
        {markers.slice(0, 3).map((m) => (
          <div 
            key={m.id} 
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={() => onSelect?.(m)}
          >
            • {m.venueName ? `Near ${m.venueName}` : `Wave size ${m.size}`} ({m.friends} friends)
          </div>
        ))}
      </div>
    </div>
  );
}