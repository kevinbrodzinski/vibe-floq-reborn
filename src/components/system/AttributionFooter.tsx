// src/components/system/AttributionFooter.tsx
import React from 'react';

export function AttributionFooter({
  collapsed = '© Mapbox • Google',
  expanded = [
    'Venue data: Google Places',
    'Map tiles: Mapbox',
    'Weather: OpenWeather',
    'Presence: Anonymized by Floq'
  ],
}: { collapsed?: string; expanded?: string[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="fixed left-4 bottom-4 z-[560] text-white/80">
      <button onClick={() => setOpen(v => !v)}
              className="bg-black/35 backdrop-blur px-3 py-2 rounded-md text-xs">
        {collapsed}{open ? ' ▲' : ' ▼'}
      </button>
      {open && (
        <div className="mt-2 bg-black/40 backdrop-blur px-3 py-2 rounded-md text-xs space-y-1">
          {expanded.map((s, i) => <div key={i}>{s}</div>)}
        </div>
      )}
    </div>
  );
}