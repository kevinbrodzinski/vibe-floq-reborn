import * as React from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createPredictedMeetSpec } from '@/lib/map/overlays/predictedMeetSpec';
import { onEvent, Events } from '@/services/eventBridge';
import { resolveVibeColor, getUserVibeHex } from '@/lib/vibe/vibeColor';
import { mixHexOklab } from '@/lib/color/mixOklab';

// feature type kept tiny for perf
type Item = {
  id:string; lng:number; lat:number; createdAt:number; expiresAt:number;
  // vibe context (optional)
  venueId?:string; venueName?:string; vibeHex?:string; vibeKey?:string;
};

export function PredictedMeetingPointsLayer(){
  // mount spec
  React.useEffect(()=>{ layerManager.register(createPredictedMeetSpec()); return ()=>layerManager.unregister('predicted-meet'); },[]);
  const itemsRef = React.useRef<Item[]>([]);

  const buildFC = React.useCallback(()=>{
    const now = Date.now();
    itemsRef.current = itemsRef.current.filter(it=>it.expiresAt>now);
    const features:any[] = [];
    for (const it of itemsRef.current){
      // gradient colors: user → venue
      const user = getUserVibeHex();
      const venue = resolveVibeColor({ venueId:it.venueId, venueName:it.venueName, vibeHex:it.vibeHex, vibeKey:it.vibeKey });
      const cA = mixHexOklab(user, venue, 0.35);
      const cB = mixHexOklab(user, venue, 0.65);

      // base
      features.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[it.lng,it.lat] },
        properties:{ kind:'dot', color: venue }
      });

      // animate radii with time fade
      const life = 3000; // 3s pulse fade
      const age = (now - it.createdAt)%life;
      const p = age/life;
      const rBase = 8 + p*22;           // 8..30 px
      const oBase = Math.max(0, 0.6*(1-p)); // fade out

      features.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[it.lng,it.lat] },
        properties:{ kind:'ringA', r:rBase*0.65, o:oBase*0.9, color:cA }
      });
      features.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[it.lng,it.lat] },
        properties:{ kind:'ringB', r:rBase, o:oBase*0.75, color:cB }
      });
    }
    return { type:'FeatureCollection', features };
  },[]);

  const render = React.useCallback(()=>{ layerManager.apply('predicted-meet', buildFC()); },[buildFC]);

  // subscribe to convergence events
  React.useEffect(()=>{
    const off = onEvent(Events.FLOQ_CONVERGENCE_DETECTED, (p)=>{
      const loc = p?.predictedLocation; if (!loc) return;
      const eta = Math.max(5, Math.min(180, Math.floor(p.timeToMeet ?? 60)));
      const now = Date.now();
      itemsRef.current.push({
        id: `pm-${now}-${Math.random().toString(36).slice(2)}`,
        lng: loc.lng, lat: loc.lat, createdAt: now,
        expiresAt: now + (eta+15)*1000, // keep a smidge past ETA
        venueId: loc.venueId, venueName: loc.venueName, vibeHex: loc.vibeHex, vibeKey: loc.vibeKey
      });
      render();
    });
    const id = setInterval(render, 96); // light pulse timer
    render();
    return ()=>{ off(); clearInterval(id); };
  },[render]);

  return null;
}
