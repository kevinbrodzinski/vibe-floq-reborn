// src/components/Temporal/TimeScrubber.tsx
import React from 'react';
import { useViewportInput } from '@/lib/map/useViewportInput';
import { useQuery } from '@tanstack/react-query';
import { fetchForecast } from '@/lib/api/forecastClient';

type Horizon = 'now' | 'p30' | 'p120' | 'historic';

export function TimeScrubber({ map, onData }: { map: any; onData: (cells: any[], insights?: string[]) => void }) {
  const [h, setH] = React.useState<Horizon>('now');
  const [preset, setPreset] = React.useState<'LastThursday'|'LastMonth'|'LastYear'>('LastThursday');
  const { viewport, viewportKey } = useViewportInput({ defaultRadius: 900 });

  const q = useQuery({
    queryKey: ['forecast', h, preset, viewportKey],
    queryFn: () => fetchForecast({ t: h, range: h==='historic' ? preset : undefined, center: viewport.center, bbox: viewport.bbox, zoom: viewport.zoom }),
    staleTime: 5 * 60_000
  });

  React.useEffect(() => { if (q.data) onData(q.data.cells, q.data.insights); }, [q.data, onData]);

  return (
    <div className="flex items-center gap-8 p-8 bg-black/30 rounded-xl backdrop-blur">
      <div className="flex gap-8">
        {(['now','p30','p120','historic'] as Horizon[]).map(x => (
          <button key={x} onClick={() => setH(x)} className={`px-10 py-6 rounded-lg ${h===x?'bg-white/20':'bg-white/10'}`}>{x==='p30'?'+30m':x==='p120'?'+2h':x}</button>
        ))}
      </div>
      {h==='historic' && (
        <select value={preset} onChange={e=>setPreset(e.target.value as any)} className="bg-white/10 px-8 py-6 rounded-lg">
          <option>LastThursday</option>
          <option>LastMonth</option>
          <option>LastYear</option>
        </select>
      )}
      {q.isLoading && <span className="ml-auto opacity-70">Loading…</span>}
    </div>
  );
}