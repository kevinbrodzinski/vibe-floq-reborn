import mapboxgl from 'mapbox-gl';
import type { OverlaySpec } from '@/lib/map/LayerManager';
import { safeVibe } from '@/lib/vibes';
import { vibeToHex } from '@/lib/vibe/color';
import { safeSetFilter } from '@/lib/map/safeFilter';

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

// ---------- shared friend-kind expressions ----------
// Use modern expression syntax; avoids invalid legacy/expr mixes like ["has", ["get","kind"]]
const FRIEND_KIND_EXPR = ["match", ["get", "kind"], ["friend", "bestie"], true, false] as const;
const FILTER_FRIEND_AVATAR = [
  "all",
  ["!has", "point_count"],
  FRIEND_KIND_EXPR,
  ["has", "iconId"],
] as const;
const FILTER_FRIEND_FALLBACK = [
  "all",
  ["!has", "point_count"],
  FRIEND_KIND_EXPR,
  ["!", ["has", "iconId"]],
] as const;

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
    });
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
    });
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
    }, CL_NUM);
  }

  // friends (symbol avatar)
  if (!map.getLayer(PT_FRIEND_AV)) {
    map.addLayer({
      id: PT_FRIEND_AV, type:'symbol', source: SID,
      filter: FILTER_FRIEND_AVATAR as any,
      layout:{
        'icon-image':['get','iconId'],
        'icon-size':['interpolate',['linear'],['zoom'], 12,0.38, 16,0.6, 18,0.72],
        'icon-allow-overlap': true,'icon-ignore-placement': true
      }
    }, PT_VENUE);
  }
  // friends fallback (small circle if icon not loaded yet)
  if (!map.getLayer(PT_FRIEND_FALL)) {
    map.addLayer({
      id: PT_FRIEND_FALL, type:'circle', source: SID,
      filter: FILTER_FRIEND_FALLBACK as any,
      paint:{
        'circle-radius':['interpolate',['linear'],['zoom'], 10,5.5, 16,7.5],
        'circle-color':['coalesce',['get','vibeHex'],'#60a5fa'],
        'circle-stroke-color':'#fff','circle-stroke-width':2
      }
    }, PT_FRIEND_AV);
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
    }, PT_FRIEND_FALL);
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

  // capture handler refs so we can detach correctly
  const onClickVenue    = clickPoint('venue');
  const onClickFriendAv = clickPoint('friend');
  const onClickFriendFb = clickPoint('friend');
  map.on('click', PT_VENUE, onClickVenue);
  map.on('click', PT_FRIEND_AV, onClickFriendAv);
  map.on('click', PT_FRIEND_FALL, onClickFriendFb);
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
  const onClusterClick = async (e:any)=>{
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
  };
  map.on('click', CL, onClusterClick);

  // hover previews (desktop only)
  let enter: ((e: any) => void) | undefined;
  let move: ((e: any) => void) | undefined; 
  let leave: (() => void) | undefined;
  let styleCleanup: (() => void) | undefined;

  if (!isTouch()) {
    const popup = new mapboxgl.Popup({ closeButton:false, closeOnClick:false, offset:10 });
    const setHTML = (title:string, hex?:string)=>popup.setHTML(
      `<div style="display:flex;gap:8px;align-items:center">
         ${hex?`<span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${hex}"></span>`:''}
         <span style="font:500 12px/1.2 Inter,system-ui">${title}</span>
       </div>`
    );

    enter = (e:any)=>{ const f = e.features?.[0]; if(!f) return;
      setHTML(f.properties?.name ?? 'Unknown', f.properties?.vibeHex ?? undefined);
      popup.setLngLat(e.lngLat).addTo(map);
      map.getCanvas().style.cursor='pointer';
    };
    move = debounce((e:any)=>{ popup.setLngLat(e.lngLat); }, 50);
    leave = ()=>{ try{popup.remove();}catch{} map.getCanvas().style.cursor=''; };

    map.on('mouseenter', PT_VENUE, enter); map.on('mousemove', PT_VENUE, move); map.on('mouseleave', PT_VENUE, leave);
    map.on('mouseenter', PT_FRIEND_AV, enter); map.on('mousemove', PT_FRIEND_AV, move); map.on('mouseleave', PT_FRIEND_AV, leave);
    map.on('mouseenter', PT_FRIEND_FALL, enter); map.on('mousemove', PT_FRIEND_FALL, move); map.on('mouseleave', PT_FRIEND_FALL, leave);

    styleCleanup = ()=>{ try{popup.remove();}catch{} };
    map.on('styledata', styleCleanup);
  }

  // Return cleanup function
  return () => {
    try { map.off('dragstart', ds); } catch {}
    try { map.off('dragend', de); } catch {}
    // Detach click handlers by reference
    try { map.off('click', PT_VENUE, onClickVenue); } catch {}
    try { map.off('click', PT_FRIEND_AV, onClickFriendAv); } catch {}
    try { map.off('click', PT_FRIEND_FALL, onClickFriendFb); } catch {}
    try { map.off('click', CL, onClusterClick); } catch {}
    
    if (includeSelfHit) {
      try { map.off('click', PT_SELF_HIT, () => {}); } catch {}
    }
    
    // Clean up hover events if not touch
    if (!isTouch()) {
      if (enter) {
        try { map.off('mouseenter', PT_VENUE, enter); } catch {}
        try { map.off('mouseenter', PT_FRIEND_AV, enter); } catch {}
        try { map.off('mouseenter', PT_FRIEND_FALL, enter); } catch {}
      }
      if (move) {
        try { map.off('mousemove', PT_VENUE, move); } catch {}
        try { map.off('mousemove', PT_FRIEND_AV, move); } catch {}
        try { map.off('mousemove', PT_FRIEND_FALL, move); } catch {}
      }
      if (leave) {
        try { map.off('mouseleave', PT_VENUE, leave); } catch {}
        try { map.off('mouseleave', PT_FRIEND_AV, leave); } catch {}
        try { map.off('mouseleave', PT_FRIEND_FALL, leave); } catch {}
      }
      if (styleCleanup) {
        try { map.off('styledata', styleCleanup); } catch {}
      }
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
      // Assert correct friend filters (prevents invalid resurrected filters on style changes)
      safeSetFilter(map, lyr(id,'friend-avatar'),   FILTER_FRIEND_AVATAR);
      safeSetFilter(map, lyr(id,'friend-fallback'), FILTER_FRIEND_FALLBACK);
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

// Helper to ensure string values for Mapbox filters
const safeString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.join(',');
  return String(value);
};

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export function buildPresenceFC(input: {
  self?: { lat:number; lng:number };
  friends?: Array<{ id:string; name?:string; photoUrl?:string; lat:number; lng:number; vibe?:string; iconId?:string }>;
  venues?: Array<{ id:string; name:string; lat:number; lng:number; category?:string }>;
} = {} as any): GeoJSON.FeatureCollection {
  const friends = Array.isArray(input?.friends) ? input.friends : [];
  const venues = Array.isArray(input?.venues) ? input.venues : [];
  const feats: GeoJSON.Feature[] = [];

  // Validate and process self
  if (input.self && typeof input.self === 'object') {
    const lat = safeNumber(input.self.lat);
    const lng = safeNumber(input.self.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      feats.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[lng, lat] },
        properties:{ kind:'self', id:'self' }
      });
    }
  }
  
  // Validate and process venues
  venues.forEach(v => {
    try {
      const lat = safeNumber(v.lat);
      const lng = safeNumber(v.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      
      feats.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[lng, lat] },
        properties:{ 
          kind:'venue', 
          id: safeString(v.id) || 'unknown-venue',
          name: safeString(v.name) || 'Unknown Venue',
          category: safeString(v.category),
          vibeHex:'#22c55e' 
        }
      });
    } catch (error) {
      console.warn('[buildPresenceFC] Invalid venue data:', v, error);
    }
  });
  
  // Validate and process friends
  friends.forEach(f => {
    try {
      const lat = safeNumber(f.lat);
      const lng = safeNumber(f.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      
      const hex = f.vibe ? vibeToHex(safeVibe(f.vibe as any)) : '#60a5fa';
      const props: Record<string, string | null> = {
        kind: 'friend',
        id: safeString(f.id) || 'unknown-friend',
        name: safeString(f.name),
        avatarUrl: safeString(f.photoUrl),
        vibeHex: hex
      };
      
      // Only add iconId if it's a valid string
      if (f.iconId && typeof f.iconId === 'string') {
        props.iconId = f.iconId;
      }
      
      feats.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[lng, lat] },
        properties: props
      });
    } catch (error) {
      console.warn('[buildPresenceFC] Invalid friend data:', f, error);
    }
  });

  return { type:'FeatureCollection', features: feats };
}
