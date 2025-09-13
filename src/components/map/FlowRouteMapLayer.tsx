import * as React from 'react';
import { useEffect, useState } from 'react';
import { onEvent, Events } from '@/services/eventBridge';
import { layerManager } from '@/lib/map/LayerManager';
import { createFlowRouteSpec } from '@/lib/map/overlays/flowRouteSpec';
import { getCurrentMap } from '@/lib/geo/mapSingleton';

export function FlowRouteMapLayer() {
  useEffect(() => {
    layerManager.register(createFlowRouteSpec());
    return () => layerManager.unregister('flow-route');
  }, []);

  const [visible, setVisible] = useState(false);
  const [retrace, setRetrace] = useState(false);
  const [fc, setFC] = useState<GeoJSON.FeatureCollection>({ type:'FeatureCollection', features:[] });

  useEffect(() => {
    const offShow = onEvent(Events.FLOQ_FLOW_SHOW, (p) => {
      setVisible(true);
      setRetrace((p?.mode ?? 'display') === 'retrace');
      setFC(toFC(p?.path ?? []));
    });
    const offHide = onEvent(Events.FLOQ_FLOW_HIDE, () => {
      setVisible(false);
      setRetrace(false);
      setFC({ type:'FeatureCollection', features:[] });
    });
    return () => { offShow(); offHide(); };
  }, []);

  useEffect(() => { layerManager.apply('flow-route', fc); }, [fc]);

  // shimmer loop only when retracing + visible
  useEffect(() => {
    const map = getCurrentMap();
    if (!visible || !retrace || !map) {
      try { map?.setPaintProperty('flow:route:anim', 'line-opacity', 0); } catch {}
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) % 3000;
      const opacity = Math.max(0, Math.sin((t/3000) * Math.PI) * 0.4);
      try { map.setPaintProperty('flow:route:anim', 'line-opacity', opacity); } catch {}
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, retrace]);

  return null;
}

function toFC(path: Array<{ position:[number,number], venueName?:string, color?:string }>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const pts = path.filter(p => Array.isArray(p.position));

  if (pts.length > 1) {
    features.push({
      type:'Feature',
      geometry:{ type:'LineString', coordinates: pts.map(p=>p.position) },
      properties:{ type:'flow' }
    } as any);
  }

  pts.forEach((p, i) => {
    features.push({
      type:'Feature',
      geometry:{ type:'Point', coordinates: p.position },
      properties:{
        type:'venue',
        venueName: p.venueName ?? 'Unknown',
        index: pts.length - i,
        ...(p.color ? { color: p.color } : {})
      }
    } as any);
  });

  return { type:'FeatureCollection', features };
}