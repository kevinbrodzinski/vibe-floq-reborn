import { useEffect, useMemo, useState } from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import type { ViewportInput } from '@/lib/api/mapContracts';

export function useViewportInput(opts?: { defaultRadius?: number }) {
  const [zoom, setZoom] = useState<number>(14);
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);
  const [bbox, setBbox] = useState<[number, number, number, number] | undefined>(undefined);

  useEffect(() => {
    const map = getCurrentMap();
    if (!map) return;
    
    const update = () => {
      const z = map.getZoom?.() ?? 14;
      const c = map.getCenter?.();
      const b = map.getBounds?.();
      setZoom(z);
      if (c) setCenter([c.lng, c.lat]);
      if (b) setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    
    update();
    map.on?.('moveend', update);
    map.on?.('load', update);
    
    return () => {
      map.off?.('moveend', update);
      map.off?.('load', update);
    };
  }, []);

  const vp: ViewportInput = useMemo(() => {
    if (center) return { center, zoom, radius: opts?.defaultRadius ?? 900 };
    if (bbox) return { bbox, zoom };
    return { center: [-118.4695, 33.9855], zoom: 14, radius: 900 };
  }, [center, bbox, zoom, opts?.defaultRadius]);

  const vpKey = useMemo(() => {
    if (vp.bbox) return `bbox:${vp.bbox.map(n=>n.toFixed(3)).join(',')}:z${vp.zoom}`;
    if (vp.center) return `ctr:${vp.center.map(n=>n.toFixed(3)).join(',')}:r${vp.radius ?? 900}:z${vp.zoom}`;
    return `z${vp.zoom}`;
  }, [vp]);

  return { viewport: vp, viewportKey: vpKey };
}