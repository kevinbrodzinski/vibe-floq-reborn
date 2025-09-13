import * as React from 'react';
import { useEffect, useState } from 'react';
import { onEvent, Events } from '@/services/eventBridge';
import { layerManager } from '@/lib/map/LayerManager';
import { createFlowRouteSpec } from '@/lib/map/overlays/flowRouteSpec';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { resolveVibeColor, getUserVibeHex } from '@/lib/vibe/vibeColor';
import { gradientStops } from '@/lib/color/mixOklab';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export function FlowRouteMapLayer(){
  // Respect user motion preferences
  const prefersReducedMotion = usePrefersReducedMotion();
  
  // register spec once
  useEffect(()=>{ 
    layerManager.register(createFlowRouteSpec()); 
    return ()=>layerManager.unregister('flow-route'); 
  },[]);
  
  const [visible,setVisible]=useState(false);
  const [retrace,setRetrace]=useState(false);
  const [fc,setFC]=useState<GeoJSON.FeatureCollection>({ type:'FeatureCollection', features:[] });

  // listen to flow show/hide events
  useEffect(()=>{
    const offShow = onEvent(Events.FLOQ_FLOW_SHOW,(p)=>{
      setVisible(true);
      setRetrace((p?.mode ?? 'display')==='retrace');
      setFC(toFeatureCollection(p?.path ?? []));
    });
    const offHide = onEvent(Events.FLOQ_FLOW_HIDE,()=>{
      setVisible(false); setRetrace(false); setFC({ type:'FeatureCollection', features:[] });
      try{ getCurrentMap()?.setPaintProperty('flow:route:anim','line-opacity',0) }catch{}
    });
    return ()=>{ offShow(); offHide(); };
  },[]);

  // apply feature collection to map
  useEffect(()=>{ 
    layerManager.apply('flow-route', visible?fc:{ type:'FeatureCollection', features:[] }); 
  },[fc,visible]);

  // shimmer loop (respect reduced motion)
  useEffect(()=>{
    const map=getCurrentMap();
    if (!visible || !retrace || !map || prefersReducedMotion){ 
      try{ map?.setPaintProperty('flow:route:anim','line-opacity',0) }catch{}; 
      return; 
    }
    let raf=0; const start=performance.now();
    const step=()=>{ 
      const t=(performance.now()-start)%3000; 
      const op=Math.max(0,Math.sin((t/3000)*Math.PI)*0.4);
      try{ map.setPaintProperty('flow:route:anim','line-opacity', op) }catch{}; 
      raf=requestAnimationFrame(step); 
    };
    raf=requestAnimationFrame(step);
    return ()=> cancelAnimationFrame(raf);
  },[visible,retrace,prefersReducedMotion]);

  return null;
}

function toFeatureCollection(path: Array<any>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const pts = path.filter(p=>Array.isArray(p.position));
  
  // flow line
  if (pts.length>1){
    const user = getUserVibeHex();
    const venue = pts[pts.length-1]?.color || resolveVibeColor({ vibeKey:'mellow' });
    const stops = gradientStops(user, venue);
    features.push({ 
      type:'Feature', 
      geometry:{ type:'LineString', coordinates: pts.map(p=>p.position) }, 
      properties:{ type:'flow', g0:stops[0][1], g1:stops[1][1], g2:stops[2][1], g3:stops[3][1] } 
    } as any);
  }
  
  // venue dots
  pts.forEach((p,i)=>features.push({
    type:'Feature', 
    geometry:{ type:'Point', coordinates:p.position },
    properties:{ 
      type:'venue', 
      venueId:p.id, 
      venueName:p.venueName ?? 'Unknown', 
      index: pts.length-i, 
      ...(p.color?{color:p.color}:{}) 
    }
  } as any));
  
  return { type:'FeatureCollection', features } as GeoJSON.FeatureCollection;
}