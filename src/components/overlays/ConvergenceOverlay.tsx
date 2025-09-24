// src/components/overlays/ConvergenceOverlay.tsx
import { useEffect, useMemo } from 'react';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { ensureGeoJSONSource, ensureLayer, persistOnStyle, findFirstSymbolLayerId } from '@/lib/map/stylePersistence';
import { getVibeToken } from '@/lib/tokens/vibeTokens';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useViewportInput } from '@/lib/map/useViewportInput';

const SRC_ID = 'floq:convergence';
const LYR_FILL = 'floq:convergence:fill';
const LYR_OUTL = 'floq:convergence:outline';

type Zone = { polygon: [number, number][], prob: number, vibe: string };
type Resp = { zones: Zone[]; ttlSec: number };

function toFC(zones: Zone[]): FeatureCollection {
  const features: Feature<Polygon, any>[] = zones.map(z => ({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [z.polygon] },
    properties: { prob: z.prob, vibe: z.vibe }
  }));
  return { type: 'FeatureCollection', features };
}

export function ConvergenceOverlay({ map }: { map: any }) {
  const { viewport, viewportKey } = useViewportInput({ defaultRadius: 900 });
  
  const friendsForApi = []; // fill with your friends' coarse positions if you have them; can start empty
  const q = useQuery({
    queryKey: ['convergence', viewportKey, friendsForApi.length],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Resp>('convergence-zones', {
        body: { friends: friendsForApi, center: viewport.center, bbox: viewport.bbox, zoom: viewport.zoom }
      });
      if (error) throw error;
      return data!;
    },
    staleTime: 120_000,
    enabled: !!map
  });

  const data = useMemo<FeatureCollection>(() => toFC(q.data?.zones ?? []), [q.data]);

  useEffect(() => {
    if (!map) return;
    const readd = () => {
      if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return;

      ensureGeoJSONSource(map, SRC_ID, data as any);
      const before = findFirstSymbolLayerId(map);
      const t = getVibeToken('calm' as any); // or current vibe

      ensureLayer(map, {
        id: LYR_FILL,
        type: 'fill',
        source: SRC_ID,
        paint: {
          'fill-color': t.glow,
          'fill-opacity': ['interpolate', ['linear'], ['get','prob'], 0.2, 0.14, 0.9, 0.38],
        }
      }, before);

      ensureLayer(map, {
        id: LYR_OUTL,
        type: 'line',
        source: SRC_ID,
        paint: {
          'line-color': t.ring,
          'line-width': 2.0,
          'line-opacity': 0.65,
          'line-blur': 0.8
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      }, before);

      // Debug telemetry
      console.debug('[floq] readded convergence layer', { src: SRC_ID, fill: LYR_FILL, outline: LYR_OUTL, t: Date.now() });
    };

    const cleanup = persistOnStyle(map, readd);
    const src: any = map.getSource(SRC_ID);
    if (src?.setData) src.setData(data as any);
    return cleanup;
  }, [map, data]);

  return null;
}