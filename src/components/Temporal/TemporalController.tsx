// src/components/Temporal/TemporalController.tsx
import React from 'react';
import { useViewportInput } from '@/lib/map/useViewportInput';
import { useForecastLayer } from '@/map/layers/useForecastLayer';
import { useQuery } from '@tanstack/react-query';
import { fetchForecast, type ForecastResp } from '@/lib/api/forecastClient';

type Horizon = 'now'|'p30'|'p120'|'historic';

export function TemporalController({ map }: { map: any }) {
  const { viewport, viewportKey } = useViewportInput({ defaultRadius: 900 });
  const [h, setH] = React.useState<Horizon>('p30');
  const [preset, setPreset] = React.useState<'LastThursday'|'LastMonth'|'LastYear'>('LastThursday');

  const q = useQuery({
    queryKey: ['forecast', h, preset, viewportKey],
    queryFn: () => fetchForecast({
      t: h, range: h==='historic' ? preset : undefined,
      center: viewport.center, bbox: viewport.bbox, zoom: viewport.zoom
    }),
    staleTime: 5 * 60_000
  });

  useForecastLayer(map, q.data?.cells);

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-6 z-[580] flex items-center gap-3 bg-black/35 backdrop-blur px-3 py-2 rounded-xl">
      {(['now','p30','p120','historic'] as Horizon[]).map(x => (
        <button key={x} onClick={() => setH(x)}
          className={`px-3 py-2 rounded-md text-sm ${h===x?'bg-white/25 text-white':'bg-white/10 text-white/80'}`}>
          {x==='p30'?'+30m':x==='p120'?'+2h':x}
        </button>
      ))}
      {h==='historic' && (
        <select value={preset} onChange={e=>setPreset(e.target.value as any)}
                className="bg-white/10 text-white/90 px-2 py-1 rounded-md">
          <option>LastThursday</option><option>LastMonth</option><option>LastYear</option>
        </select>
      )}
      {q.isLoading && <span className="ml-2 text-white/80 text-sm">Loading…</span>}
    </div>
  );
}