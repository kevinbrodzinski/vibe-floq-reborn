import * as React from 'react';
import { useMemo, useEffect, useState } from 'react';
import { onEvent, emitEvent, Events } from '@/services/eventBridge';
import { layerManager } from '@/lib/map/LayerManager';
import { createFlowRouteSpec } from '@/lib/map/overlays/flowRouteSpec';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import type mapboxgl from 'mapbox-gl';

export function FlowRouteMapLayer() {
  // register spec once
  useEffect(() => {
    layerManager.register(createFlowRouteSpec());
    return () => layerManager.unregister('flow-route');
  }, []);

  const [visible, setVisible] = useState(false);
  const [isRetracing, setRetrace] = useState(false);
  const [fc, setFC] = useState<GeoJSON.FeatureCollection>({ type:'FeatureCollection', features: [] });

  // listen to flow show/hide
  useEffect(() => {
    const offShow = onEvent(Events.FLOQ_FLOW_SHOW, (p) => {
      setVisible(true);
      setRetrace((p?.mode ?? 'display') === 'retrace');
      setFC(toFeatureCollection(p ?? { path: [], mode: 'display' }));
    });
    const offHide = onEvent(Events.FLOQ_FLOW_HIDE, () => {
      setVisible(false);
      setRetrace(false);
      setFC({ type:'FeatureCollection', features: [] });
    });
    return () => { offShow(); offHide(); };
  }, []);

  // apply FC
  useEffect(() => {
    layerManager.apply('flow-route', fc);
  }, [fc]);

  // shimmer loop (only if retracing and visible)
  useEffect(() => {
    if (!visible || !isRetracing) {
      try { getCurrentMap()?.setPaintProperty('flow:route:anim', 'line-opacity', 0); } catch {}
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) % 3000;
      const phase = t / 3000; // 0..1
      const opacity = Math.max(0, Math.sin(phase * Math.PI) * 0.4);
      try { getCurrentMap()?.setPaintProperty('flow:route:anim', 'line-opacity', opacity); } catch {}
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, isRetracing]);

  return null;
}

// Helper: same shape you've been using (path entries: {id, position:[lng,lat], venueName?, color?})
function toFeatureCollection(data: { path?: any[]; mode?: 'retrace'|'display' }): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const pts = (data.path ?? []).filter((p: any) => Array.isArray(p.position));

  if (pts.length > 1) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: pts.map((p:any)=>p.position) },
      properties: { type: 'flow' }
    } as any);
  }

  pts.forEach((p: any, i: number) => {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p.position },
      properties: {
        type: 'venue',
        venueId: p.id,
        venueName: p.venueName ?? 'Unknown',
        index: pts.length - i,
        ...(p.color ? { color: p.color } : {})
      }
    } as any);
  });

  return { type: 'FeatureCollection', features };
}