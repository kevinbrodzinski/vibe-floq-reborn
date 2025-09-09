// src/components/Temporal/TemporalController.tsx
import React from 'react';
import { useViewportInput } from '@/lib/map/useViewportInput';
import { useForecastLayer } from '@/map/layers/useForecastLayer';
import { useQuery } from '@tanstack/react-query';
import { fetchForecast, type ForecastResp } from '@/lib/api/forecastClient';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { TemporalConfidenceHUD } from './TemporalConfidenceHUD';

type Horizon = 'now'|'p30'|'p120'|'historic';

export function TemporalController({ map, onInsight, pixiLayerRef }: { 
  map?: any; 
  onInsight?: (s?:string)=>void;
  pixiLayerRef?: React.MutableRefObject<any | null>;
}) {
  const currentMap = map || getCurrentMap();
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

  useForecastLayer(currentMap, q.data?.cells);

  React.useEffect(() => { 
    if (q.data?.insights?.[0]) onInsight?.(q.data.insights[0]) 
  }, [q.data, onInsight]);

  // Emit temporal data to PIXI layer with confidence
  React.useEffect(() => {
    if (!pixiLayerRef?.current || !q.data?.cells) return;
    
    pixiLayerRef.current.emit('temporal', { 
      horizon: h, 
      cells: q.data.cells, 
      confidence: q.data.confidence ?? 0.7 
    });
  }, [pixiLayerRef, q.data, h]);

  // Helper for horizon labels
  const horizonText = (h: Horizon) => {
    return h === 'p30' ? '+30m' : h === 'p120' ? '+2h' : h === 'now' ? 'Now' : 'Historic'
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-6 z-[580] flex items-center gap-3 bg-black/35 backdrop-blur px-3 py-2 rounded-xl">
    {(['now','p30','p120','historic'] as Horizon[]).map(x => (
      <button
        key={x}
        onClick={() => setH(x)}
        className={`px-3 py-2 rounded-md text-sm ${h===x?'bg-white/25 text-white':'bg-white/10 text-white/80'}`}
      >
        {horizonText(x)}
      </button>
    ))}
      
      {/* Confidence HUD */}
      <div className="ml-2">
        <TemporalConfidenceHUD confidence={q.data?.confidence} horizonLabel={horizonText(h)} />
      </div>
      {h==='historic' && (
        <select
          value={preset}
          onChange={e=>setPreset(e.target.value as any)}
          className="bg-white/10 text-white/90 px-2 py-1 rounded-md"
        >
          <option>LastThursday</option>
          <option>LastMonth</option>
          <option>LastYear</option>
        </select>
      )}
      {q.isLoading && <span className="ml-2 text-white/80 text-sm">Loading…</span>}
    </div>
  );
}