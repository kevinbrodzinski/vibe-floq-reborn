import mapboxgl from 'mapbox-gl';
import type { OverlaySpec } from '@/lib/map/LayerManager';
import { safeVibe } from '@/lib/vibes';
import { vibeToHex } from '@/lib/vibe/color';

// ---------- small helpers ----------
const lyr = (id:string,s:string)=>`${id}-${s}`;
const srcId = (id:string)=>`${id}-src`;
const isTouch = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);

function debounce<F extends (...a:any[])=>void>(fn:F, ms=120){
  let t = 0 as any;
  return (...args:Parameters<F>)=>{
    clearTimeout(t); t=setTimeout(()=>fn(...args), ms) as any;
  };
}
function moveToTop(map: mapboxgl.Map, ids: string[]) {
  const all = map.getStyle()?.layers?.map(l=>l.id) ?? [];
  const top = all[all.length-1];
  if (!top) return;
  ids.forEach(id => { if(map.getLayer(id)) try{ map.moveLayer(id, top); }catch{} });
}

// ---------- sprite for avatars ----------
export async function ensureAvatarImage(map: mapboxgl.Map, userId: string, url: string, size=64): Promise<string|null> {
  const id = `avatar:${userId}:${size}`;
  if (map.hasImage(id)) return id;
  try {
    const img = await new Promise<HTMLImageElement>((res,rej)=>{
      const im = new Image(size, size);
      im.crossOrigin = 'anonymous';
      im.onload=()=>res(im); im.onerror=rej; im.src=url;
    });
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = size;
    const ctx = cnv.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(size/2,size/2,size/2,0,Math.PI*2);
    ctx.closePath(); ctx.clip(); ctx.drawImage(img,0,0,size,size);
    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage(id, imageData, { pixelRatio: 1 });
    return id;
  } catch { return null; }
}

// ---------- source & layers ----------
function ensureSource(map: mapboxgl.Map, sid: string, fc?: GeoJSON.FeatureCollection) {
  if (map.getSource(sid)) return;
  map.addSource(sid, {
    type:'geojson',
    data: fc ?? { type:'FeatureCollection', features: [] },
    cluster: true, clusterRadius: 60, clusterMaxZoom: 16, generateId: true
  } as any);
}

function addLayers(map: mapboxgl.Map, id: string, includeSelfHit = false) {
  const SID = srcId(id);
  const CL = lyr(id,'cluster');
  const CL_NUM = lyr(id,'cluster-count');
  const PT_VENUE = lyr(id,'venue');
  const PT_FRIEND_AV = lyr(id,'friend-avatar');
  const PT_FRIEND_FALL = lyr(id,'friend-fallback');
  const PT_SELF_HIT = lyr(id,'self-hit');

  // clusters
  if (!map.getLayer(CL)) {
    map.addLayer({
      id: CL, type:'circle', source: SID, filter:['has','point_count'],
      paint:{
        'circle-radius': [
          'interpolate', ['linear'], ['get','point_count'],
          5,14, 25,18, 50,22, 100,26
        ],
        'circle-color':'#334155', 'circle-stroke-color':'#fff','circle-stroke-width':2,'circle-opacity':0.9
      }
    } as mapboxgl.CircleLayer);
  }
  if (!map.getLayer(CL_NUM)) {
    map.addLayer({
      id: CL_NUM, type:'symbol', source: SID, filter:['has','point_count'],
      layout:{
        'text-field':['to-string',['get','point_count_abbreviated']],
        'text-size':['interpolate',['linear'],['zoom'], 12,11, 16,14],
        'text-font':['Inter Semi Bold','Open Sans Semibold','Arial Unicode MS Bold'],
        'text-allow-overlap': true
      },
      paint:{ 'text-color':'#fff','text-halo-color':'#000','text-halo-width':1 }
    } as mapboxgl.SymbolLayer);
  }

  // venues (circle)
  if (!map.getLayer(PT_VENUE)) {
    map.addLayer({
      id: PT_VENUE, type:'circle', source: SID,
      filter:['all', ['!has','point_count'], ['==',['get','kind'],'venue']],
      paint:{
        'circle-radius':['interpolate',['linear'],['zoom'], 10,6, 16,9],
        'circle-color':['coalesce',['get','vibeHex'],'#22c55e'],
        'circle-stroke-color':'#fff', 'circle-stroke-width':2
      }
    } as mapboxgl.CircleLayer, CL_NUM);
  }

  // friends (symbol avatar)
  if (!map.getLayer(PT_FRIEND_AV)) {
    map.addLayer({
      id: PT_FRIEND_AV, type:'symbol', source: SID,
      filter:['all',['!has','point_count'],['==',['get','kind'],'friend'],['has','iconId']],
      layout:{
        'icon-image':['get','iconId'],
        'icon-size':['interpolate',['linear'],['zoom'], 12,0.38, 16,0.6, 18,0.72],
        'icon-allow-overlap': true,'icon-ignore-placement': true
      }
    } as mapboxgl.SymbolLayer, PT_VENUE);
  }
  // friends fallback (small circle if icon not loaded yet)
  if (!map.getLayer(PT_FRIEND_FALL)) {
    map.addLayer({
      id: PT_FRIEND_FALL, type:'circle', source: SID,
      filter:['all',['!has','point_count'],['==',['get','kind'],'friend'],['!has','iconId']],
      paint:{
        'circle-radius':['interpolate',['linear'],['zoom'], 10,5.5, 16,7.5],
        'circle-color':['coalesce',['get','vibeHex'],'#60a5fa'],
        'circle-stroke-color':'#fff','circle-stroke-width':2
      }
    } as mapboxgl.CircleLayer, PT_FRIEND_AV);
  }

  // self (invisible hit target – aura stays in its own overlay)
  if (includeSelfHit && !map.getLayer(PT_SELF_HIT)) {
    map.addLayer({
      id: PT_SELF_HIT, type:'circle', source: SID,
      filter:['all',['!has','point_count'],['==',['get','kind'],'self']],
      paint:{
        'circle-radius':['interpolate',['linear'],['zoom'], 10,12, 16,16],
        'circle-color':'rgba(0,0,0,0)',
        'circle-stroke-color':'rgba(0,0,0,0)',
        'circle-pitch-scale':'viewport'
      }
    } as mapboxgl.CircleLayer, PT_FRIEND_FALL);
  }

  // keep on top
  const layers = includeSelfHit 
    ? [PT_SELF_HIT, PT_FRIEND_AV, PT_FRIEND_FALL, PT_VENUE, CL_NUM, CL]
    : [PT_FRIEND_AV, PT_FRIEND_FALL, PT_VENUE, CL_NUM, CL];
  moveToTop(map, layers);
}

function removeLayers(map: mapboxgl.Map, id: string) {
  [lyr(id,'self-hit'), lyr(id,'friend-fallback'), lyr(id,'friend-avatar'), lyr(id,'venue'),
   lyr(id,'cluster-count'), lyr(id,'cluster')].forEach(L => { try { if(map.getLayer(L)) map.removeLayer(L); } catch {} });
  try { if (map.getSource(srcId(id))) map.removeSource(srcId(id)); } catch {}
}

// ---------- click/hover wiring ----------
function wireInteractions(map: mapboxgl.Map, id: string, includeSelfHit = false) {
  const SID = srcId(id);
  const CL = lyr(id,'cluster');
  const PT_VENUE = lyr(id,'venue');
  const PT_FRIEND_AV = lyr(id,'friend-avatar');
  const PT_FRIEND_FALL = lyr(id,'friend-fallback');
  const PT_SELF_HIT = lyr(id,'self-hit');

  let dragging = false;
  const ds = ()=>{ dragging = true; };
  const de = ()=>{ setTimeout(()=>dragging=false, 120); };
  map.on('dragstart', ds);
  map.on('dragend', de);

  const select = (detail:any)=>window.dispatchEvent(new CustomEvent(
    detail.kind==='venue' ? 'venues:select' : 'friends:select', { detail }
  ));

  const clickPoint = (kind:'friend'|'venue') => (e:any)=>{
    if (dragging || map.isMoving()) return;
    const f = e.features?.[0]; if(!f) return;
    const pt = e.lngLat.wrap();
    select({
      kind, id: f.properties?.id ?? f.properties?.friendId ?? f.properties?.venueId ?? '',
      name: f.properties?.name ?? '',
      lngLat: { lng: pt.lng, lat: pt.lat },
      color: f.properties?.vibeHex ?? '#60a5fa',
      properties: f.properties ?? {}
    });
  };

  map.on('click', PT_VENUE, clickPoint('venue'));
  map.on('click', PT_FRIEND_AV, clickPoint('friend'));
  map.on('click', PT_FRIEND_FALL, clickPoint('friend'));
  map.on('click', PT_SELF_HIT, async (e:any)=>{
    if (dragging || map.isMoving()) return;
    const pt = e.lngLat.wrap();
    
    window.dispatchEvent(new CustomEvent('friends:select', {
      detail: { 
        kind:'friend', id:'self', name:'You',
        lngLat:{ lng: pt.lng, lat: pt.lat },
        color: getComputedStyle(document.documentElement).getPropertyValue('--vibe-hex').trim() || '#22d3ee',
        properties:{ self:true }
      }
    }));

    // Gentle highlight, fire-and-forget
    try {
      const { recenterAndHighlight } = await import('@/lib/map/overlays/userAuraHighlight');
      recenterAndHighlight(map, { durationMs: 900, easeMs: 350, alphaBoost: 0.2, keepZoom: true });
    } catch {}
  });

  // cluster click → expand/spider
  map.on('click', CL, async (e:any)=>{
    if (dragging || map.isMoving()) return;
    const src = map.getSource(SID) as any;
    const f = e.features?.[0]; if(!src || !f) return;
    const clusterId = f.properties?.cluster_id;
    const zoom = map.getZoom();
    const SPIDERFY_Z = 16;

    if (zoom < SPIDERFY_Z) {
      src.getClusterExpansionZoom(clusterId, (err:any, target:number)=>{
        if(err) return;
        map.easeTo({ center:e.lngLat, zoom: Math.max(target, SPIDERFY_Z-0.25), duration: 350 });
      });
      return;
    }

    src.getClusterLeaves(clusterId, 25, 0, (err:any, leaves:any[])=>{
      if (err || !leaves?.length) return;
      const layerId = lyr(id,'spider');
      const spiderSrcId = `${SID}-spider`;

      try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
      try { if (map.getSource(spiderSrcId)) map.removeSource(spiderSrcId); } catch {}

      const center = f.geometry.coordinates as [number,number];
      const centerPt = map.project(center);
      const radiusPx = 36;
      const angleStep = (2*Math.PI)/leaves.length;

      const features = leaves.map((leaf:any,i:number)=>{
        const angle = i*angleStep;
        const pt = { x: centerPt.x+radiusPx*Math.cos(angle), y: centerPt.y+radiusPx*Math.sin(angle) };
        const lngLat = map.unproject([pt.x, pt.y]);
        return { type:'Feature', geometry:{ type:'Point', coordinates:[lngLat.lng,lngLat.lat] },
          properties:{ ...leaf.properties, __spider:true } };
      });

      map.addSource(spiderSrcId,{ type:'geojson', data:{ type:'FeatureCollection', features } as any});
      map.addLayer({
        id: layerId, type:'circle', source: spiderSrcId,
        paint:{ 'circle-radius':7,'circle-color':['coalesce',['get','vibeHex'],'#60a5fa'],'circle-stroke-color':'#fff','circle-stroke-width':2 }
      });

      const onSpiderClick = (ev:any)=>{
        const f2 = ev.features?.[0]; if(!f2) return;
        const p = ev.lngLat.wrap();
        select({
          kind: f2.properties?.kind==='venue'?'venue':'friend',
          id: f2.properties?.id ?? '',
          name: f2.properties?.name ?? '',
          lngLat: { lng:p.lng, lat:p.lat },
          color: f2.properties?.vibeHex ?? '#60a5fa',
          properties: f2.properties ?? {}
        });
        cleanup();
      };

      const cleanup = ()=>{
        try { map.off('click', layerId, onSpiderClick); } catch {}
        try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
        try { if (map.getSource(spiderSrcId)) map.removeSource(spiderSrcId); } catch {}
        map.off('move', cleanup); map.off('zoom', cleanup); map.off('mousedown', cleanup);
      };

      map.on('click', layerId, onSpiderClick);
      map.on('move', cleanup); map.on('zoom', cleanup); map.on('mousedown', cleanup);
    });
  });

  // hover previews (desktop only)
  if (!isTouch()) {
    const popup = new mapboxgl.Popup({ closeButton:false, closeOnClick:false, offset:10 });
    const setHTML = (title:string, hex?:string)=>popup.setHTML(
      `<div style="display:flex;gap:8px;align-items:center">
         ${hex?`<span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${hex}"></span>`:''}
         <span style="font:500 12px/1.2 Inter,system-ui">${title}</span>
       </div>`
    );

    const enter = (e:any)=>{ const f = e.features?.[0]; if(!f) return;
      setHTML(f.properties?.name ?? 'Unknown', f.properties?.vibeHex ?? undefined);
      popup.setLngLat(e.lngLat).addTo(map);
      map.getCanvas().style.cursor='pointer';
    };
    const move = debounce((e:any)=>{ popup.setLngLat(e.lngLat); }, 50);
    const leave = ()=>{ try{popup.remove();}catch{} map.getCanvas().style.cursor=''; };

    map.on('mouseenter', PT_VENUE, enter); map.on('mousemove', PT_VENUE, move); map.on('mouseleave', PT_VENUE, leave);
    map.on('mouseenter', PT_FRIEND_AV, enter); map.on('mousemove', PT_FRIEND_AV, move); map.on('mouseleave', PT_FRIEND_AV, leave);
    map.on('mouseenter', PT_FRIEND_FALL, enter); map.on('mousemove', PT_FRIEND_FALL, move); map.on('mouseleave', PT_FRIEND_FALL, leave);

    const styleCleanup = ()=>{ try{popup.remove();}catch{} };
    map.on('styledata', styleCleanup);
  }

  // Return cleanup function
  return () => {
    try { map.off('dragstart', ds); } catch {}
    try { map.off('dragend', de); } catch {}
    
    // Clean up all event listeners
    try { map.off('click', PT_VENUE, () => {}); } catch {}
    try { map.off('click', PT_FRIEND_AV, () => {}); } catch {}
    try { map.off('click', PT_FRIEND_FALL, () => {}); } catch {}
    try { map.off('click', CL, () => {}); } catch {}
    
    if (includeSelfHit) {
      try { map.off('click', PT_SELF_HIT, () => {}); } catch {}
    }
    
    // Clean up hover events if not touch
    if (!isTouch()) {
      try { map.off('mouseenter', PT_VENUE, () => {}); } catch {}
      try { map.off('mousemove', PT_VENUE, () => {}); } catch {}
      try { map.off('mouseleave', PT_VENUE, () => {}); } catch {}
      try { map.off('mouseenter', PT_FRIEND_AV, () => {}); } catch {}
      try { map.off('mousemove', PT_FRIEND_AV, () => {}); } catch {}
      try { map.off('mouseleave', PT_FRIEND_AV, () => {}); } catch {}
      try { map.off('mouseenter', PT_FRIEND_FALL, () => {}); } catch {}
      try { map.off('mousemove', PT_FRIEND_FALL, () => {}); } catch {}
      try { map.off('mouseleave', PT_FRIEND_FALL, () => {}); } catch {}
      try { map.off('styledata', () => {}); } catch {}
    }
  };
}

// ---------- public overlay ----------
export function createPresenceClusterOverlay(options: {
  id?: string;
  beforeId?: string;
  initial?: GeoJSON.FeatureCollection;
  includeSelfHit?: boolean; // default false – aura owns self-tap
}): OverlaySpec {
  const id = options.id ?? 'presence';
  const SID = srcId(id);
  const includeSelfHit = options.includeSelfHit === true;
  let disposeInteractions: (()=>void) | null = null;

  return {
    id,
    beforeId: options.beforeId,
    mount(map) {
      if (!map.isStyleLoaded()) { map.once('idle', () => this.mount(map)); return; }
      ensureSource(map, SID, options.initial);
      addLayers(map, id, includeSelfHit);
      disposeInteractions = wireInteractions(map, id, includeSelfHit);
      const layers = includeSelfHit 
        ? [lyr(id,'self-hit'), lyr(id,'friend-avatar'), lyr(id,'friend-fallback'), lyr(id,'venue'), lyr(id,'cluster-count'), lyr(id,'cluster')]
        : [lyr(id,'friend-avatar'), lyr(id,'friend-fallback'), lyr(id,'venue'), lyr(id,'cluster-count'), lyr(id,'cluster')];
      moveToTop(map, layers);
    },
    update(map, fc) {
      const src = map.getSource(SID) as mapboxgl.GeoJSONSource | undefined;
      if (src && fc) src.setData(fc as any);
    },
    unmount(map) {
      try { disposeInteractions?.(); } catch {}
      removeLayers(map, id);
    }
  };
}

export function buildPresenceFC(input: {
  self?: { lat:number; lng:number };
  friends?: Array<{ id:string; name?:string; photoUrl?:string; lat:number; lng:number; vibe?:string; iconId?:string }>;
  venues?: Array<{ id:string; name:string; lat:number; lng:number; category?:string }>;
} = {} as any): GeoJSON.FeatureCollection {
  const friends = Array.isArray(input?.friends) ? input.friends : [];
  const venues = Array.isArray(input?.venues) ? input.venues : [];
  const feats: GeoJSON.Feature[] = [];

  if (input.self) {
    feats.push({
      type:'Feature',
      geometry:{ type:'Point', coordinates:[input.self.lng, input.self.lat] },
      properties:{ kind:'self', id:'self' }
    });
  }
  
  venues.forEach(v=>{
    feats.push({
      type:'Feature',
      geometry:{ type:'Point', coordinates:[v.lng, v.lat] },
      properties:{ kind:'venue', id:v.id, name:v.name, category:v.category ?? null, vibeHex:'#22c55e' }
    });
  });
  
  friends.forEach(f=>{
    const hex = f.vibe ? vibeToHex(safeVibe(f.vibe as any)) : '#60a5fa';
    const props: any = {
      kind:'friend', id:f.id, name:f.name ?? null, avatarUrl:f.photoUrl ?? null,
      vibeHex: hex
    };
    if (f.iconId) props.iconId = f.iconId;
    
    feats.push({
      type:'Feature',
      geometry:{ type:'Point', coordinates:[f.lng, f.lat] },
      properties: props
    });
  });

  return { type:'FeatureCollection', features: feats };
}
