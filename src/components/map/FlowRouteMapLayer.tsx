import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { onEvent, emitEvent, Events } from '@/services/eventBridge';
import { layerManager } from '@/lib/map/LayerManager';
import { createFlowRouteSpec } from '@/lib/map/overlays/flowRouteSpec';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import mapboxgl from 'mapbox-gl';
import { getUserVibeHex } from '@/lib/vibe/vibeColor';
import { mixHexOklab } from '@/lib/vibe/vibeGradient';

export function FlowRouteMapLayer() {
  // persisted local toggle
  const LS_KEY = 'floq:layers:flow-route:enabled';
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { const raw = localStorage.getItem(LS_KEY); return raw == null ? true : raw === 'true'; } catch { return true; }
  });

  useEffect(() => {
    layerManager.register(createFlowRouteSpec());
    return () => layerManager.unregister('flow-route');
  }, []);

  const [visible, setVisible] = useState(false);
  const [isRetracing, setIsRetracing] = useState(false);
  const [fc, setFC] = useState<GeoJSON.FeatureCollection>({ type:'FeatureCollection', features:[] });

  // Observe layer toggle events for "flow-route"
  useEffect(() => {
    const offToggle = onEvent(Events.FLOQ_LAYER_TOGGLE, (p) => {
      if (!p || p.id !== 'flow-route') return;
      setEnabled(prev => {
        const next = p.enabled == null ? !prev : !!p.enabled;
        try { localStorage.setItem(LS_KEY, String(next)); } catch {}
        // if disabling, also hide and stop retrace
        if (!next) {
          setVisible(false);
          setIsRetracing(false);
          setFC({ type:'FeatureCollection', features:[] });
          try { getCurrentMap()?.setPaintProperty('flow:route:anim', 'line-opacity', 0); } catch {}
        }
        return next;
      });
    });
    const offSet = onEvent(Events.FLOQ_LAYER_SET, (p) => {
      if (!p || p.id !== 'flow-route') return;
      setEnabled(!!p.enabled);
      try { localStorage.setItem(LS_KEY, String(!!p.enabled)); } catch {}
      if (!p.enabled) {
        setVisible(false);
        setIsRetracing(false);
        setFC({ type:'FeatureCollection', features:[] });
        try { getCurrentMap()?.setPaintProperty('flow:route:anim', 'line-opacity', 0); } catch {}
      }
    });
    return () => { offToggle(); offSet(); };
  }, []);

  // listen to flow show/hide
  useEffect(() => {
    const offShow = onEvent(Events.FLOQ_FLOW_SHOW, (p) => {
      if (!enabled) return; // ignore if disabled
      setVisible(true);
      setIsRetracing((p?.mode ?? 'display') === 'retrace');
      setFC(toFC(p?.path ?? []));
    });
    const offHide = onEvent(Events.FLOQ_FLOW_HIDE, () => {
      setVisible(false);
      setIsRetracing(false);
      setFC({ type:'FeatureCollection', features:[] });
    });
    return () => { offShow(); offHide(); };
  }, [enabled]);

  // cache points array for hover math
  const pointsRef = useRef<Array<{position:[number,number]}>>([]);
  const hoverMarkerRef = useRef<mapboxgl.Marker|null>(null);

  useEffect(() => {
    // suppress application if disabled
    layerManager.apply('flow-route', enabled ? fc : { type:'FeatureCollection', features:[] });
    // cache points array for hover math
    try {
      const features = (fc as any).features || [];
      pointsRef.current = features
        .filter((f:any)=>f.properties?.type==='venue')
        .sort((a:any,b:any)=> (a.properties.index||0) - (b.properties.index||0))
        .map((f:any)=>({ position: f.geometry.coordinates as [number,number]}));
    } catch { pointsRef.current = []; }
  }, [fc, enabled]);

  // shimmer loop only when retracing + visible + enabled
  useEffect(() => {
    const map = getCurrentMap();
    if (!visible || !enabled) {
      try { map?.setPaintProperty('flow:route:anim', 'line-opacity', 0); } catch {}
      // cleanup hover marker
      try { hoverMarkerRef.current?.remove(); hoverMarkerRef.current=null; } catch {}
      return;
    }
    if (!map) return;

    // pointer on venues
    const onEnterDots = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onLeaveDots = () => { map.getCanvas().style.cursor = ''; };
    const onClickDots = (e:any) => {
      const f = e?.features?.[0];
      const idx = f?.properties?.index ? Number(f.properties.index) : NaN;
      if (Number.isFinite(idx)) {
        // index is reverse-numbered (N..1) so convert
        const logical = pointsRef.current.length - idx;
        emitEvent(Events.FLOQ_FLOW_RETRACE_GOTO, { index: logical });
      }
    };
    map.on('mouseenter','flow:route:venues', onEnterDots);
    map.on('mouseleave','flow:route:venues', onLeaveDots);
    map.on('click','flow:route:venues', onClickDots);

    // hover affordance on the line (only retrace)
    const onEnterLine = () => { map.getCanvas().style.cursor = isRetracing ? 'pointer' : ''; };
    const onLeaveLine = () => { map.getCanvas().style.cursor = ''; try { hoverMarkerRef.current?.remove(); hoverMarkerRef.current=null; } catch {} };
    // simple throttle for pointer-move (avoid flood)
    let lastMove = 0;
    const onMoveLine = (e:any) => {
      if (!isRetracing) return;
      const now = performance.now();
      if (now - lastMove < 32) return;
      lastMove = now;
      const idx = nearestIndex(e.lngLat.lng, e.lngLat.lat, pointsRef.current);
      const coord = pointsRef.current[idx]?.position;
      if (!coord) return;
      if (!hoverMarkerRef.current) {
        const el = document.createElement('div');
        el.style.width='10px'; el.style.height='10px'; el.style.borderRadius='9999px';
        el.style.background='#EC4899'; el.style.boxShadow='0 0 0 8px rgba(236,72,153,0.15)';
        hoverMarkerRef.current = new mapboxgl.Marker({element: el, anchor:'center'}).setLngLat(coord).addTo(map);
      } else {
        hoverMarkerRef.current.setLngLat(coord);
      }
    };
    const onClickLine = (e:any) => {
      if (!isRetracing) return;
      const idx = nearestIndex(e.lngLat.lng, e.lngLat.lat, pointsRef.current);
      emitEvent(Events.FLOQ_FLOW_RETRACE_GOTO, { index: idx });
    };
    map.on('mouseenter','flow:route:line', onEnterLine);
    map.on('mouseleave','flow:route:line', onLeaveLine);
    map.on('mousemove','flow:route:line', onMoveLine);
    map.on('click','flow:route:line', onClickLine);

    // shimmer animation for retrace mode
    if (isRetracing) {
      let raf = 0;
      const start = performance.now();
      const step = () => {
        const t = (performance.now() - start) % 3000;
        const opacity = Math.max(0, Math.sin((t/3000) * Math.PI) * 0.4);
        try { map.setPaintProperty('flow:route:anim', 'line-opacity', opacity); } catch {}
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      
      return () => {
        cancelAnimationFrame(raf);
        map.off('mouseenter','flow:route:line', onEnterLine);
        map.off('mouseleave','flow:route:line', onLeaveLine);
        map.off('mousemove','flow:route:line', onMoveLine);
        map.off('click','flow:route:line', onClickLine);
        map.off('mouseenter','flow:route:venues', onEnterDots);
        map.off('mouseleave','flow:route:venues', onLeaveDots);
        map.off('click','flow:route:venues', onClickDots);
        try { hoverMarkerRef.current?.remove(); hoverMarkerRef.current=null; } catch {}
      };
    }

    return () => {
      map.off('mouseenter','flow:route:line', onEnterLine);
      map.off('mouseleave','flow:route:line', onLeaveLine);
      map.off('mousemove','flow:route:line', onMoveLine);
      map.off('click','flow:route:line', onClickLine);
      map.off('mouseenter','flow:route:venues', onEnterDots);
      map.off('mouseleave','flow:route:venues', onLeaveDots);
      map.off('click','flow:route:venues', onClickDots);
      try { hoverMarkerRef.current?.remove(); hoverMarkerRef.current=null; } catch {}
    };
  }, [visible, isRetracing, enabled]);

  return null;
}

function toFC(path: Array<{ position:[number,number], venueName?:string, color?:string }>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const pts = path.filter(p => Array.isArray(p.position));

  // DI: get user vibe and (optionally) the destination vibe
  const userColor = getUserVibeHex?.() ?? '#8B5CF6'
  const venueColor = (pts.length>0 && pts[pts.length-1]?.color) || '#EC4899'

  if (pts.length > 1) {
    features.push({
      type:'Feature',
      geometry:{ type:'LineString', coordinates: pts.map(p=>p.position) },
      properties:{
        type:'flow',
        userColor: userColor,
        venueColor: venueColor,
        // simple mid = 50% blend (replace with real vibe distance scalar later)
        midColor: mixHexOklab(userColor, venueColor, 0.5),
      }
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

function nearestIndex(lng:number,lat:number, pts:Array<{position:[number,number]}>) {
  if (!pts.length) return 0;
  let best = 0; let bestD = Infinity;
  for (let i=0;i<pts.length;i++) {
    const dx = pts[i].position[0]-lng, dy = pts[i].position[1]-lat;
    const d = dx*dx+dy*dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}